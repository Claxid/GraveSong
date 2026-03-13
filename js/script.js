 

document.getElementById('myAudio').volume = 0.6;


document.addEventListener('click', function() {
    document.getElementById('myAudio').muted = false;
  }, { once: true });

function PageSuiv() {
    window.location.href = "template/loading.html";
}

document.addEventListener('click', PageSuiv );


document.addEventListener('keydown', (e) => {
    if (e.key !== "F11") {
        PageSuiv();
    }
    

  })





  