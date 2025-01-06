document.getElementById('categoryFilter').addEventListener('change', e => {
    let selectCategory = e.target.value;
    let cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        let category = card.getAttribute('data-category');

        if(selectCategory === '' || category === selectCategory) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
});