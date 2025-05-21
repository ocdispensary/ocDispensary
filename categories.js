// categories.js
fetch('categories.json')
  .then(r => r.json())
  .then(cats => {
    const grid = document.getElementById('categories-grid');  

    cats.forEach(cat => {
      const tile = document.createElement('div');
      tile.className = 'category-tile';       
      tile.innerHTML = `
        <a href="${cat.link}" aria-label="${cat.name}">
          <img src="${cat.img}" alt="${cat.name}" loading="lazy">
          <h3 class="tile-title">${cat.name}</h3>
        </a>`;
      grid.appendChild(tile);
    });
  })
