using System;
using System.Collections.Generic;
using System.Collections.Concurrent;

namespace typerace.Models
{
    public class Room
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public ConcurrentDictionary<string, Player> Players { get; set; }
        public GameState GameState { get; set; }
        public DateTime CreatedAt { get; set; }
        public string TextToType { get; set; }
        public bool IsGameActive { get; set; }
        public DateTime? GameStartTime { get; set; }
        public int GameDurationSeconds { get; set; } = 60;

        public Room()
        {
            Id = Guid.NewGuid().ToString();
            Players = new ConcurrentDictionary<string, Player>();
            GameState = GameState.Waiting;
            CreatedAt = DateTime.UtcNow;
            IsGameActive = false;
        }

        public Room(string name) : this()
        {
            Name = name;
        }
    }

    public class Player
    {
        public string ConnectionId { get; set; }
        public string Name { get; set; }
        public int CurrentPosition { get; set; }
        public int WordsPerMinute { get; set; }
        public int Accuracy { get; set; }
        public bool IsReady { get; set; }
        public bool HasCompleted { get; set; }
        public DateTime? CompletionTime { get; set; }

        public Player(string connectionId, string name)
        {
            ConnectionId = connectionId;
            Name = name;
            CurrentPosition = 0;
            WordsPerMinute = 0;
            Accuracy = 100;
            IsReady = false;
            HasCompleted = false;
        }
    }

    public enum GameState
    {
        Waiting,
        Countdown,
        InProgress,
        Finished
    }
}