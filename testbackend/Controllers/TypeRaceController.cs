using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using typerace.Models;
using typerace.Service;

namespace typerace.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TypeRaceController : ControllerBase
    {
        private readonly RoomService _roomService;

        public TypeRaceController(RoomService roomService)
        {
            _roomService = roomService;
        }

        [HttpGet("rooms")]
        public IActionResult GetRooms()
        {
            var rooms = _roomService.GetAllRooms();
            var roomList = rooms.Select(r => new
            {
                r.Id,
                r.Name,
                PlayerCount = r.Players.Count,
                r.GameState,
                r.IsGameActive
            }).ToList();

            return Ok(roomList);
        }

        [HttpGet("rooms/{roomId}")]
        public IActionResult GetRoom(string roomId)
        {
            var room = _roomService.GetRoom(roomId);
            if (room == null)
            {
                return NotFound();
            }

            var roomDetails = new
            {
                room.Id,
                room.Name,
                Players = room.Players.Values.Select(p => new
                {
                    p.Name,
                    p.IsReady,
                    p.WordsPerMinute,
                    p.Accuracy,
                    p.HasCompleted
                }).ToList(),
                room.GameState,
                room.IsGameActive
            };

            return Ok(roomDetails);
        }
    }
}