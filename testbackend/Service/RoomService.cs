using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using typerace.Models;



namespace typerace.Service
{
    public class RoomService
    {
        private readonly ConcurrentDictionary<string, Room> _rooms;

        public RoomService()
        {
            _rooms = new ConcurrentDictionary<string, Room>();
        }

        public Room CreateRoom(string name)
        {
            var room = new Room(name);
            _rooms.TryAdd(room.Id, room);
            return room;
        }

        public Room GetRoom(string roomId)
        {
            _rooms.TryGetValue(roomId, out Room room);
            return room;
        }

        public List<Room> GetAllRooms()
        {
            return _rooms.Values.ToList();
        }

        public bool RemoveRoom(string roomId)
        {
            return _rooms.TryRemove(roomId, out _);
        }
    }
}