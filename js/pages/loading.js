// Page de chargement
// Elle attend 5 secondes pour simuler un chargement, puis va au menu.

// Afficher la page de chargement pendant 5 secondes
window.addEventListener('load', function() {
    // Attendre 5 secondes avant de rediriger
    setTimeout(function() {
        // Rediriger vers la page principale (index.html)
        window.location.href = 'menu.html';
    }, 5000);
});
