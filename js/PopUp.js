document.getElementById('btnOK').addEventListener('click', function() {
    const alerte = document.getElementById('alerteF11');
    alerte.classList.add('hide');
    

    setTimeout(function() {
        alerte.style.display = 'none';
    }, 500);
});