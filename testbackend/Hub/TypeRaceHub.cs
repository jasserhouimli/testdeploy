using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using System.Linq;
using typerace.Models;
using typerace.Service;
using typerace.Models;
namespace typerace.Hub
{
    public class TypeRaceHub : Microsoft.AspNetCore.SignalR.Hub
    {
        private readonly RoomService _roomService;

        public TypeRaceHub(RoomService roomService)
        {
            _roomService = roomService;
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var rooms = _roomService.GetAllRooms();
            foreach (var room in rooms)
            {
                if (room.Players.TryRemove(Context.ConnectionId, out Player player))
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.Id);
                    await Clients.Group(room.Id).SendAsync("PlayerLeft", player.Name);
                    
                    // If the room is empty, remove it
                    if (room.Players.Count == 0)
                    {
                        _roomService.RemoveRoom(room.Id);
                    }
                    // If game is in progress, check if all remaining players have completed
                    else if (room.GameState == GameState.InProgress)
                    {
                        CheckGameCompletion(room);
                    }
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task CreateRoom(string roomName, string playerName)
        {
            var room = _roomService.CreateRoom(roomName);
            var player = new Player(Context.ConnectionId, playerName);
            
            room.Players.TryAdd(Context.ConnectionId, player);
            await Groups.AddToGroupAsync(Context.ConnectionId, room.Id);
            
            await Clients.Caller.SendAsync("RoomCreated", room.Id, room.Name);
            await Clients.Group(room.Id).SendAsync("PlayerJoined", playerName);
        }

        public async Task JoinRoom(string roomId, string playerName)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Room not found");
                return;
            }

            if (room.GameState != GameState.Waiting)
            {
                await Clients.Caller.SendAsync("Error", "Game already in progress");
                return;
            }

            var player = new Player(Context.ConnectionId, playerName);
            room.Players.TryAdd(Context.ConnectionId, player);
            
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            
            // Send room details to the new player
            await Clients.Caller.SendAsync("RoomJoined", room.Id, room.Name);
            
            // Notify all players in the room about the new player
            await Clients.Group(roomId).SendAsync("PlayerJoined", playerName);
            
            // Send the list of all players to the new player
            var players = room.Players.Values.Select(p => p.Name).ToList();
            await Clients.Caller.SendAsync("PlayerList", players);
        }

        public async Task SetReady(string roomId, bool isReady)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null) return;

            if (room.Players.TryGetValue(Context.ConnectionId, out Player player))
            {
                player.IsReady = isReady;
                await Clients.Group(roomId).SendAsync("PlayerReady", player.Name, isReady);

                // Check if all players are ready
                if (room.Players.Count >= 2 && room.Players.Values.All(p => p.IsReady))
                {
                    await StartGame(roomId);
                }
            }
        }

        public async Task StartGame(string roomId)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null) return;

            room.GameState = GameState.Countdown;
            room.TextToType = TextContent.GetRandomText();
            
            // Send countdown
            await Clients.Group(roomId).SendAsync("GameCountdown", 3);
            await Task.Delay(1000);
            await Clients.Group(roomId).SendAsync("GameCountdown", 2);
            await Task.Delay(1000);
            await Clients.Group(roomId).SendAsync("GameCountdown", 1);
            await Task.Delay(1000);
            
            // Start the game
            room.GameState = GameState.InProgress;
            room.IsGameActive = true;
            room.GameStartTime = DateTime.UtcNow;
            
            await Clients.Group(roomId).SendAsync("GameStarted", room.TextToType);
        }

        public async Task UpdateProgress(string roomId, int position, int accuracy)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null || room.GameState != GameState.InProgress) return;

            if (room.Players.TryGetValue(Context.ConnectionId, out Player player))
            {
                player.CurrentPosition = position;
                player.Accuracy = accuracy;
                
                // Calculate WPM based on current progress
                if (room.GameStartTime.HasValue)
                {
                    var elapsedMinutes = (DateTime.UtcNow - room.GameStartTime.Value).TotalMinutes;
                    if (elapsedMinutes > 0)
                    {
                        // Assuming 5 characters per word on average
                        var wordsTyped = position / 5.0;
                        player.WordsPerMinute = (int)(wordsTyped / elapsedMinutes);
                    }
                }
                
                // Check if player has completed the text
                if (position >= room.TextToType.Length)
                {
                    player.HasCompleted = true;
                    player.CompletionTime = DateTime.UtcNow;
                    
                    await Clients.Group(roomId).SendAsync("PlayerCompleted", player.Name, player.WordsPerMinute, player.Accuracy);
                    
                    // Check if all players have completed
                    CheckGameCompletion(room);
                }
                else
                {
                    // Send progress update to all players in the room
                    await Clients.Group(roomId).SendAsync("ProgressUpdate", player.Name, position, player.WordsPerMinute, player.Accuracy);
                }
            }
        }

        private async void CheckGameCompletion(Room room)
        {
            if (room.Players.Count > 0 && room.Players.Values.All(p => p.HasCompleted))
            {
                room.GameState = GameState.Finished;
                room.IsGameActive = false;
                
                // Sort players by completion time
                var results = room.Players.Values
                    .Where(p => p.HasCompleted)
                    .OrderBy(p => p.CompletionTime)
                    .Select(p => new 
                    {
                        Name = p.Name,
                        WPM = p.WordsPerMinute,
                        Accuracy = p.Accuracy
                    })
                    .ToList();
                
                await Clients.Group(room.Id).SendAsync("GameCompleted", results);
                
                // Reset player states for a new game
                foreach (var player in room.Players.Values)
                {
                    player.CurrentPosition = 0;
                    player.WordsPerMinute = 0;
                    player.Accuracy = 100;
                    player.IsReady = false;
                    player.HasCompleted = false;
                    player.CompletionTime = null;
                }
                
                room.GameState = GameState.Waiting;
            }
        }

        public async Task LeaveRoom(string roomId)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null) return;

            if (room.Players.TryRemove(Context.ConnectionId, out Player player))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                await Clients.Group(roomId).SendAsync("PlayerLeft", player.Name);
                
                // If the room is empty, remove it
                if (room.Players.Count == 0)
                {
                    _roomService.RemoveRoom(roomId);
                }
                // If game is in progress, check if all remaining players have completed
                else if (room.GameState == GameState.InProgress)
                {
                    CheckGameCompletion(room);
                }
            }
        }
    }
}