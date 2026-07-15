function handleMenu(action) {

  if (action === 'continue') {

    document.getElementById('status-text').textContent =
      'Resuming... Chapter 2 — The Darkened Hallway';

    showDialog('Resuming Game', 'Returning to where you left off. The monster is waiting.', [
      {
        label: 'Resume',
        primary: true,
        action: () => {
          closeDialog();
          document.getElementById('status-text').textContent =
            'Game running — Chapter 2';
        }
      },
      {
        label: 'Cancel',
        action: closeDialog
      }
    ]);

  } 
  
  else if (action === 'new') {

  window.location.href = "/loading.html";

  } 
  
  else if (action === 'exit') {

    showDialog('Exit Game', 'Your progress will be saved. Leaving so soon?', [
      {
        label: 'Exit',
        primary: true,
        action: () => {
          closeDialog();
          window.location.href = "/loading.html";
        }
      },
      {
        label: 'Stay',
        action: closeDialog
      }
    ]);

  }

}