using System.Collections.Generic;

namespace typerace.Models
{
    public static class TextContent
    {
        private static readonly List<string> TextSamples = new List<string>
        {
            "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet at least once.",
            "Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using many programming languages.",
            "TypeRace is a multiplayer typing game where players compete to see who can type a given text the fastest and most accurately.",
            "Practice makes perfect. The more you type, the faster and more accurate you become. Regular practice is key to improving your typing speed.",
            "The Internet is a global network of billions of computers and other electronic devices. With the Internet, it's possible to access almost any information, communicate with anyone else in the world, and do much more."
        };

        public static string GetRandomText()
        {
            var random = new System.Random();
            return TextSamples[random.Next(TextSamples.Count)];
        }
    }
}