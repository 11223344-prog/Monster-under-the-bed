// Menu item hover effects
const items = document.querySelectorAll('.menu-item');
items.forEach(el => {
  el.addEventListener('mouseenter', () => {
    items.forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
  });
});

// Dialog functions
function showDialog(title, msg, buttons) {
  document.getElementById('dlg-title').textContent = title;
  document.getElementById('dlg-msg').textContent = msg;
  const btnsEl = document.getElementById('dlg-btns');
  btnsEl.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'dialog-btn' + (b.primary ? ' primary' : '');
    btn.textContent = b.label;
    btn.onclick = b.action;
    btnsEl.appendChild(btn);
  });
  document.getElementById('dialog-overlay').classList.add('show');
}

function closeDialog() {
  document.getElementById('dialog-overlay').classList.remove('show');
}

// Menu handlers
function handleMenu(action) {
  if (action === 'continue') {
    document.getElementById('status-text').textContent = 'Resuming... Chapter 2 — The Darkened Hallway';
    showDialog('Resuming Game', 'Returning to where you left off. The monster is waiting.', [
      { label: 'Resume', primary: true, action: () => { 
        closeDialog(); 
        document.getElementById('status-text').textContent = 'Game running — Chapter 2'; 
      }},
      { label: 'Cancel', action: closeDialog }
    ]);
  } else if (action === 'new') {
    showDialog('New Game', 'Starting over will erase your current save. Are you sure you want to begin again?', [
      { label: 'Start Over', primary: true, action: () => { 
        closeDialog(); 
        document.getElementById('status-text').textContent = 'New game started — Chapter 1'; 
      }},
      { label: 'Cancel', action: closeDialog }
    ]);
  } else if (action === 'exit') {
    showDialog('Exit Game', 'Your progress will be saved. Leaving so soon?', [
      { label: 'Exit', primary: true, action: () => { 
        closeDialog(); 
        document.getElementById('status-text').textContent = 'Goodbye... for now.'; 
      }},
      { label: 'Stay', action: closeDialog }
    ]);
  }
}