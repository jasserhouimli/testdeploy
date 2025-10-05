// Global variables
let connection;
let currentRoom = null;
let playerName = '';
let textToType = '';
let isReady = false;
let gameActive = false;

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    createRoom: document.getElementById('createRoomScreen'),
    joinRoom: document.getElementById('joinRoomScreen'),
    roomList: document.getElementById('roomListScreen'),
    waitingRoom: document.getElementById('waitingRoomScreen'),
    game: document.getElementById('gameScreen'),
    results: document.getElementById('resultsScreen')
};

// Initialize SignalR connection
function initializeSignalR() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("https://dotnet-1a1c-5000.prg1.zerops.app/typeracehub")
        .withAutomaticReconnect()
        .build();

    // Connection events
    connection.onreconnecting(error => {
        console.log('Connection lost. Reconnecting...', error);
    });

    connection.onreconnected(connectionId => {
        console.log('Connection reestablished. Connected with ID', connectionId);
    });

    // SignalR event handlers
    setupSignalREventHandlers();

    // Start the connection
    connection.start()
        .then(() => {
            console.log('Connected to SignalR hub');
        })
        .catch(err => {
            console.error('Error connecting to SignalR hub:', err);
            setTimeout(initializeSignalR, 5000);
        });
}

// Setup SignalR event handlers
function setupSignalREventHandlers() {
    connection.on('RoomCreated', (roomId, roomName) => {
        currentRoom = { id: roomId, name: roomName };
        document.getElementById('waitingRoomName').textContent = roomName;
        document.getElementById('roomIdBadge').textContent = `ID: ${roomId}`;
        showScreen('waitingRoom');
    });

    connection.on('RoomJoined', (roomId, roomName) => {
        currentRoom = { id: roomId, name: roomName };
        document.getElementById('waitingRoomName').textContent = roomName;
        document.getElementById('roomIdBadge').textContent = `ID: ${roomId}`;
        showScreen('waitingRoom');
    });

    connection.on('PlayerJoined', (name) => {
        const playersList = document.getElementById('playersList');
        const playerItem = document.createElement('li');
        playerItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        playerItem.dataset.player = name;
        playerItem.innerHTML = `
            <span class="player-name">${name}</span>
            <span class="ready-status badge bg-secondary">Not Ready</span>
        `;
        playersList.appendChild(playerItem);
    });

    connection.on('PlayerLeft', (name) => {
        const playerItem = document.querySelector(`#playersList li[data-player="${name}"]`);
        if (playerItem) {
            playerItem.remove();
        }

        // Remove player progress bar if in game
        const progressBar = document.querySelector(`#playersProgress div[data-player="${name}"]`);
        if (progressBar) {
            progressBar.remove();
        }
    });

    connection.on('PlayerList', (players) => {
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        players.forEach(name => {
            const playerItem = document.createElement('li');
            playerItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            playerItem.dataset.player = name;
            playerItem.innerHTML = `
                <span class="player-name">${name}</span>
                <span class="ready-status badge bg-secondary">Not Ready</span>
            `;
            playersList.appendChild(playerItem);
        });
    });

    connection.on('PlayerReady', (name, ready) => {
        const playerItem = document.querySelector(`#playersList li[data-player="${name}"]`);
        if (playerItem) {
            const readyStatus = playerItem.querySelector('.ready-status');
            if (ready) {
                readyStatus.textContent = 'Ready';
                readyStatus.className = 'ready-status badge bg-success';
            } else {
                readyStatus.textContent = 'Not Ready';
                readyStatus.className = 'ready-status badge bg-secondary';
            }
        }
    });

    connection.on('GameCountdown', (count) => {
        const countdown = document.getElementById('countdown');
        countdown.textContent = count;
        countdown.classList.remove('d-none');
        
        if (count === 3) {
            showScreen('game');
        }
    });

    connection.on('GameStarted', (text) => {
        document.getElementById('countdown').classList.add('d-none');
        textToType = text;
        
        // Display text to type
        const textElement = document.getElementById('textToType');
        textElement.innerHTML = '';
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.textContent = text[i];
            textElement.appendChild(span);
        }
        
        // Enable input
        const typeInput = document.getElementById('typeInput');
        typeInput.value = '';
        typeInput.disabled = false;
        typeInput.focus();
        
        // Initialize player progress bars
        initializePlayerProgressBars();
        
        // Set game as active
        gameActive = true;
    });

    connection.on('ProgressUpdate', (playerName, position, wpm, accuracy) => {
        updatePlayerProgress(playerName, position, wpm, accuracy);
    });

    connection.on('PlayerCompleted', (playerName, wpm, accuracy) => {
        const progressBar = document.querySelector(`#playersProgress div[data-player="${playerName}"]`);
        if (progressBar) {
            const progressElement = progressBar.querySelector('.progress-bar');
            progressElement.style.width = '100%';
            progressElement.textContent = '100%';
            
            const wpmElement = progressBar.querySelector('.wpm');
            wpmElement.textContent = `${wpm} WPM`;
            
            const accuracyElement = progressBar.querySelector('.accuracy');
            accuracyElement.textContent = `${accuracy}% Accuracy`;
        }
    });

    connection.on('GameCompleted', (results) => {
        gameActive = false;
        document.getElementById('typeInput').disabled = true;
        
        // Display results
        const resultsTableBody = document.getElementById('resultsTableBody');
        resultsTableBody.innerHTML = '';
        
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            if (index === 0) row.className = 'winner';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.name}</td>
                <td>${result.wpm}</td>
                <td>${result.accuracy}%</td>
            `;
            
            resultsTableBody.appendChild(row);
        });
        
        showScreen('results');
    });

    connection.on('Error', (message) => {
        alert(`Error: ${message}`);
    });
}

// Initialize player progress bars
function initializePlayerProgressBars() {
    const playersProgress = document.getElementById('playersProgress');
    playersProgress.innerHTML = '';
    
    const playersList = document.getElementById('playersList');
    const players = playersList.querySelectorAll('li');
    
    players.forEach(player => {
        const playerName = player.dataset.player;
        const progressDiv = document.createElement('div');
        progressDiv.className = 'player-progress';
        progressDiv.dataset.player = playerName;
        
        progressDiv.innerHTML = `
            <div class="d-flex justify-content-between">
                <span class="player-name">${playerName}</span>
                <span class="stats">
                    <span class="wpm">0 WPM</span> | 
                    <span class="accuracy">100% Accuracy</span>
                </span>
            </div>
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
            </div>
        `;
        
        playersProgress.appendChild(progressDiv);
    });
}

// Update player progress
function updatePlayerProgress(playerName, position, wpm, accuracy) {
    const progressBar = document.querySelector(`#playersProgress div[data-player="${playerName}"]`);
    if (progressBar) {
        const progressPercent = Math.round((position / textToType.length) * 100);
        const progressElement = progressBar.querySelector('.progress-bar');
        progressElement.style.width = `${progressPercent}%`;
        progressElement.textContent = `${progressPercent}%`;
        
        const wpmElement = progressBar.querySelector('.wpm');
        wpmElement.textContent = `${wpm} WPM`;
        
        const accuracyElement = progressBar.querySelector('.accuracy');
        accuracyElement.textContent = `${accuracy}% Accuracy`;
    }
}

// Show a specific screen
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.add('d-none');
    });
    screens[screenName].classList.remove('d-none');
}

// Load available rooms
async function loadRooms() {
    try {
        const response = await fetch('https://dotnet-1a1c-5000.prg1.zerops.app/api/typerace/rooms');
        const rooms = await response.json();
        
        const roomsTableBody = document.getElementById('roomsTableBody');
        roomsTableBody.innerHTML = '';
        
        if (rooms.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="text-center">No rooms available</td>';
            roomsTableBody.appendChild(row);
            return;
        }
        
        rooms.forEach(room => {
            const row = document.createElement('tr');
            
            let statusBadge = '';
            if (room.gameState === 0) {
                statusBadge = '<span class="badge bg-success">Waiting</span>';
            } else if (room.gameState === 1) {
                statusBadge = '<span class="badge bg-warning">Countdown</span>';
            } else if (room.gameState === 2) {
                statusBadge = '<span class="badge bg-danger">In Progress</span>';
            } else {
                statusBadge = '<span class="badge bg-info">Finished</span>';
            }
            
            row.innerHTML = `
                <td>${room.name}</td>
                <td>${room.playerCount}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary join-room-btn" data-room-id="${room.id}" 
                        ${room.gameState !== 0 ? 'disabled' : ''}>Join</button>
                </td>
            `;
            
            roomsTableBody.appendChild(row);
        });
        
        // Add event listeners to join buttons
        document.querySelectorAll('.join-room-btn').forEach(button => {
            button.addEventListener('click', () => {
                const roomId = button.dataset.roomId;
                document.getElementById('roomId').value = roomId;
                joinRoom(roomId);
            });
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize SignalR
    initializeSignalR();
    
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => {
            showScreen('home');
        });
    });
    
    // Create Room button
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        showScreen('createRoom');
    });
    
    // Join Room button
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        showScreen('joinRoom');
    });
    
    // View Rooms button
    document.getElementById('viewRoomsBtn').addEventListener('click', () => {
        playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        showScreen('roomList');
        loadRooms();
    });
    
    // Create Room Submit button
    document.getElementById('createRoomSubmitBtn').addEventListener('click', () => {
        const roomName = document.getElementById('roomName').value.trim();
        if (!roomName) {
            alert('Please enter a room name');
            return;
        }
        
        connection.invoke('CreateRoom', roomName, playerName)
            .catch(err => console.error('Error creating room:', err));
    });
    
    // Join Room Submit button
    document.getElementById('joinRoomSubmitBtn').addEventListener('click', () => {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) {
            alert('Please enter a room ID');
            return;
        }
        
        joinRoom(roomId);
    });
    
    // Refresh Rooms button
    document.getElementById('refreshRoomsBtn').addEventListener('click', loadRooms);
    
    // Ready button
    document.getElementById('readyBtn').addEventListener('click', () => {
        isReady = !isReady;
        const readyBtn = document.getElementById('readyBtn');
        
        if (isReady) {
            readyBtn.textContent = 'Not Ready';
            readyBtn.classList.remove('btn-success');
            readyBtn.classList.add('btn-warning');
        } else {
            readyBtn.textContent = 'Ready';
            readyBtn.classList.remove('btn-warning');
            readyBtn.classList.add('btn-success');
        }
        
        connection.invoke('SetReady', currentRoom.id, isReady)
            .catch(err => console.error('Error setting ready status:', err));
    });
    
    // Leave Room button
    document.getElementById('leaveRoomBtn').addEventListener('click', () => {
        if (currentRoom) {
            connection.invoke('LeaveRoom', currentRoom.id)
                .then(() => {
                    currentRoom = null;
                    showScreen('home');
                })
                .catch(err => console.error('Error leaving room:', err));
        }
    });
    
    // Type Input
    document.getElementById('typeInput').addEventListener('input', (e) => {
        if (!gameActive || !currentRoom) return;
        
        const input = e.target.value;
        const textElement = document.getElementById('textToType');
        const spans = textElement.querySelectorAll('span');
        
        let correctChars = 0;
        let incorrectChars = 0;
        
        // Reset all spans
        spans.forEach(span => {
            span.className = '';
        });
        
        // Mark characters as correct or incorrect
        for (let i = 0; i < input.length; i++) {
            if (i >= textToType.length) break;
            
            if (input[i] === textToType[i]) {
                spans[i].className = 'correct';
                correctChars++;
            } else {
                spans[i].className = 'incorrect';
                incorrectChars++;
            }
        }
        
        // Mark current position
        if (input.length < textToType.length) {
            spans[input.length].className = 'current';
        }
        
        // Calculate accuracy
        const totalChars = correctChars + incorrectChars;
        const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
        
        // Calculate progress
        const progress = Math.round((input.length / textToType.length) * 100);
        
        // Update stats
        document.getElementById('accuracyStat').textContent = `${accuracy}%`;
        document.getElementById('progressStat').textContent = `${progress}%`;
        
        // Send progress to server
        connection.invoke('UpdateProgress', currentRoom.id, input.length, accuracy)
            .catch(err => console.error('Error updating progress:', err));
        
        // Check if completed
        if (input.length === textToType.length) {
            gameActive = false;
            document.getElementById('typeInput').disabled = true;
        }
    });
    
    // Play Again button
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        if (currentRoom) {
            showScreen('waitingRoom');
            isReady = false;
            document.getElementById('readyBtn').textContent = 'Ready';
            document.getElementById('readyBtn').classList.remove('btn-warning');
            document.getElementById('readyBtn').classList.add('btn-success');
        }
    });
    
    // Exit Game button
    document.getElementById('exitGameBtn').addEventListener('click', () => {
        if (currentRoom) {
            connection.invoke('LeaveRoom', currentRoom.id)
                .then(() => {
                    currentRoom = null;
                    showScreen('home');
                })
                .catch(err => console.error('Error leaving room:', err));
        }
    });
    
    // Room ID badge (click to copy)
    document.getElementById('roomIdBadge').addEventListener('click', () => {
        if (currentRoom) {
            navigator.clipboard.writeText(currentRoom.id)
                .then(() => {
                    alert('Room ID copied to clipboard');
                })
                .catch(err => {
                    console.error('Error copying room ID:', err);
                });
        }
    });
});

// Join room function
function joinRoom(roomId) {
    connection.invoke('JoinRoom', roomId, playerName)
        .catch(err => console.error('Error joining room:', err));
}