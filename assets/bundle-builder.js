document.addEventListener("DOMContentLoaded", function () {
  console.log("Bundle Builder: DOM loaded, initializing...");

  initializeBundleBuilder();
});

function initializeBundleBuilder() {
  const bundleCards = document.querySelectorAll(".bundle-card");

  console.log(`Bundle Builder: Found ${bundleCards.length} bundle cards`);

  bundleCards.forEach((card, index) => {
    // EXTRACT BUNDLE DATA FROM THE CARDS
    const bundleData = extractBundleData(card);

    console.log(`Bundle ${index + 1} data: `, bundleData);

    // CLICK HANDLER FOR EACH CARD
    card.addEventListener("click", function () {
      console.log("Bundle card clicked: ", bundleData.bundleName);
      handleBundleCardClick(bundleData);
    });
    card.style.cursor = "pointer";
  });
}

function extractBundleData(card) {
  const bundleId = card.dataset.bundleId;
  const maxItems = parseInt(card.dataset.maxItems);
  const discount = parseFloat(card.dataset.discount);
  const bundleName = card.querySelector("h2").textContent;

  // EXTRACT DEFAULT ITEMS IN JSON
  const eligibleCollections = card.dataset.eligibleCollections
    ? JSON.parse(card.dataset.eligibleCollections)
    : [];

  const defaultItemsElement = card.querySelector(".bundle-default-items");
  let defaultItems = [];

  if (defaultItemsElement) {
    const defaultItemsJson = defaultItemsElement.dataset.defaultItemsJson;

    try {
      defaultItems = JSON.parse(defaultItemsJson);
      console.log("Default items parsed: ", defaultItems);
    } catch (e) {
      console.error("Error parsing default items: ", e);
    }
  }

  return {
    bundleId,
    maxItems,
    discount,
    bundleName,
    defaultItems,
    eligibleCollections,
  };
}

function handleBundleCardClick(bundleData) {
  console.log("Opening bundle customizer for: ", bundleData);

  const modal = createBundleModal(bundleData);
  document.body.appendChild(modal); //??????? explain

  // INITIALIZE MODAL
  initializeModal(modal, bundleData);
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function createBundleModal(bundleData) {
  console.log("Creating modal for bundle: ", bundleData.bundleName);

  const modal = document.createElement("div");
  modal.className = "bundle-modal";

  modal.innerHTML = `
    <div class = "bundle-modal-overlay"></div>
    <div class = "bundle-modal-content">
      <div class = "bundle-modal-header">
        <h2> Customize ${bundleData.bundleName}</h2>
        <button class = "close-modal" type = "button">&times;</button>
      </div>

      <div class = "bundle-modal-body">
        <div class = "bundle-customizer">
          <div class = "selected-items">
            <h3>Selected Items (<span class="selected-count">${bundleData.defaultItems.length}</span>/${bundleData.maxItems})</h3>
            <div class = "selected-items-list">
              <!-- Items will be populated here -->
            </div>
          </div>

          <div class = "available-products">
            <h3>Choose Your Products</h3>
            <div class="product-search">
              <input type="text" class="search-input" placeholder="Search products..."/>
              <div class="search-filters">
                <select class="collection-filter">
                  <option value="">All Collections</option>
                </select>
              </div>
            </div>
            <div class="products-loading" style="display: none;">Loading products...</div>
            <div class="products-grid">
              <!--Products will be loaded here -->
            </div>
            <div class="load-more-container" style="display: none;">
              <button class="load-more-btn" type="button">Load More Products</button>
            </div>
          </div>
        </div>

        <div class = "bundle-summary">
          <div class = "pricing-summary">
            <div class = "total-price">Total: $0.00</div>
            <div class = "discount-amount">Discount: -$0.00</div>
            <div class = "final-price">Bundle Price: $0.00</div>
          </div>
          <button class = "add-bundle-to-cart" type = "button" disabled>Add Bundle to Cart</button>
        </div>
        
      </div>
    </div>
  `;
  return modal;
}

function initializeModal(modal, bundleData) {
  console.log("Initializing modal functionality");

  let selectedItems = [...bundleData.defaultItems];
  let availableProducts = [];
  let currentPage = 1;
  let hasMoreProducts = true;
  let searchTimeout = null;

  // MODAL ELEMENTS
  const closeButton = modal.querySelector(".close-modal");
  const overlay = modal.querySelector(".bundle-modal-overlay");
  const modalContent = modal.querySelector(".bundle-modal-content");
  const searchInput = modal.querySelector(".search-input");
  const collectionFilter = modal.querySelector(".collection-filter");
  const productsGrid = modal.querySelector(".products-grid");
  const loadingDiv = modal.querySelector(".products-loading");
  const loadMoreBtn = modal.querySelector(".load-more-btn");
  const addToCartBtn = modal.querySelector(".add-bundle-to-cart");

  // ELIGIBLE COLLECTIONS ONLY
  function populateCollectionFilter() {
    collectionFilter.innerHTML =
      '<option value="">Eligible Collections</option>';

    if (
      bundleData.eligibleCollections &&
      bundleData.eligibleCollections.length > 0
    ) {
      bundleData.eligibleCollections.forEach((collection) => {
        const option = document.createElement("option");
        option.value = collection;
        option.textContent =
          collection.charAt(0).toUpperCase() +
          collection.slice(1).replace(/-/g, " ");
        collectionFilter.appendChild(option);
      });
    }
  }

  // CLOSE MODAL
  function closeModal() {
    restoreBodyScroll();
    modal.remove();
  }

  // CLOSE EVENT LISTENERS
  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);

  // PREVENT CLOSING WHEN CLICKING ON MODAL CONTENT
  modalContent.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  //INITIALIZE SELECTED ITEMS DISPLAY
  updateSelectedItemDisplay(modal, selectedItems, bundleData);

  // SEARCH FUNCTION
  searchInput.addEventListener("input", function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadProducts(true);
    }, 300);
  });

  //COLLECTION FILTER
  collectionFilter.addEventListener("change", function () {
    currentPage = 1;
    loadProducts(true);
  });

  // LOAD MORE PRODUCTS
  loadMoreBtn.addEventListener("click", function () {
    currentPage++;
    loadProducts(false);
  });

  // ADD TO CART
  addToCartBtn.addEventListener("click", function () {
    addBundleToCart(selectedItems, bundleData);
  });
  

  // LOAD PRODUCTS FUNCTION
  async function loadProducts(reset = false) {
    if (reset) {
      productsGrid.innerHTML = "";
      hasMoreProducts = true;
    }
    loadingDiv.style.display = "block";

    try {
      const searchQuery = searchInput.value.trim();
      const selectedCollection = collectionFilter.value;

      // Determine which collections to search
      let collectionsToSearch = [];

      if (selectedCollection) {
        // If a specific collection is selected, use only that one
        collectionsToSearch = [selectedCollection];
      } else if (
        bundleData.eligibleCollections &&
        bundleData.eligibleCollections.length > 0
      ) {
        // If no specific collection selected, use all eligible collections
        collectionsToSearch = bundleData.eligibleCollections;
      } else {
        // Fallback to all collections if no eligible collections specified
        collectionsToSearch = ["all"];
      }

      console.log("Collections to search:", collectionsToSearch);

      let allProducts = [];

      // Fetch products from each eligible collection
      for (const collection of collectionsToSearch) {
        let url;
        if (collection === "all") {
          url = `/collections/all/products.json?limit=50&page=${currentPage}`;
        } else {
          url = `/collections/${collection}/products.json?limit=50&page=${currentPage}`;
        }

        if (searchQuery) {
          url += `&q=${encodeURIComponent(searchQuery)}`;
        }

        console.log(
          `Fetching products from collection "${collection}": ${url}`
        );

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.products && data.products.length > 0) {
            allProducts = [...allProducts, ...data.products];
          }
        } catch (collectionError) {
          console.warn(
            `Error fetching from collection "${collection}":`,
            collectionError
          );
        }
      }

      // Remove duplicates based on product ID
      const uniqueProducts = allProducts.filter(
        (product, index, self) =>
          index === self.findIndex((p) => p.id === product.id)
      );

      // Apply pagination to the combined results
      const startIndex = (currentPage - 1) * 12;
      const endIndex = startIndex + 12;
      const paginatedProducts = uniqueProducts.slice(startIndex, endIndex);

      if (paginatedProducts.length > 0) {
        if (reset) {
          availableProducts = paginatedProducts;
        } else {
          availableProducts = [...availableProducts, ...paginatedProducts];
        }

        renderProducts(paginatedProducts, reset);

        hasMoreProducts = endIndex < uniqueProducts.length;
        loadMoreBtn.parentElement.style.display = hasMoreProducts
          ? "block"
          : "none";
      } else {
        if (reset) {
          if (
            bundleData.eligibleCollections &&
            bundleData.eligibleCollections.length > 0
          ) {
            productsGrid.innerHTML = `<p>No products found in eligible collections: ${bundleData.eligibleCollections.join(
              ", "
            )}</p>`;
          } else {
            productsGrid.innerHTML = "<p>No products found.</p>";
          }
        }
        hasMoreProducts = false;
        loadMoreBtn.parentElement.style.display = "none";
      }
    } catch (error) {
      console.error("Error loading products: ", error);
      if (reset) {
        productsGrid.innerHTML =
          "<p>Error loading products. Please try again.</p>";
      }
    } finally {
      loadingDiv.style.display = "none";
    }
  }

  // RENDER PRODUCTS IN THE GRID
  function renderProducts(products, reset = false) {
    const fragment = document.createDocumentFragment();

    products.forEach((product) => {
      //SKIP ALREADY SELECTED PRODUCTS
      const isSelected = selectedItems.some((item) => item.productId === product.id);

      const productElement = document.createElement("div");
      productElement.className = `product-item ${isSelected ? "selected" : ""}`;
      productElement.dataset.productId = product.id;

      const imageUrl =
        product.images && product.images.length > 0
          ? product.images[0].src.replace(
              /\.(jpg|jpeg|png|gif|webp)/,
              "_200x200.$1"
            )
          : "";

      const imageHtml = imageUrl
        ? `<img src="${imageUrl}" alt="${product.title}" width="80" height="80">`
        : '<div class="no-image">No Image</div>';

      productElement.innerHTML = `
          <div class="product-image">${imageHtml}</div>
          <div class="product-details">
            <div class="product-title">${product.title}</div>
            <div class="product-price">${formatMoney(
              product.variants[0].price * 100
            )}</div>
          </div>
          <button class="add-product-btn" type="button" ${
            isSelected ? "disabled" : ""
          }>
            ${isSelected ? "Added" : "Add"}
          </button>
        `;

      const addBtn = productElement.querySelector(".add-product-btn");
      addBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        addProductToBundle(product);
      });

      fragment.appendChild(productElement);
    });

    if (reset) {
      productsGrid.innerHTML = "";
    }
    productsGrid.appendChild(fragment);
  }

  function addProductToBundle(product) {
    if (selectedItems.length >= bundleData.maxItems) {
      alert(`Bundle is full! Maximum ${bundleData.maxItems} items allowed.`);
      return;
    }

    // Check if product is already selected
    if (selectedItems.some((item) => item.productId === product.id)) {
      return;
    }

    // FIRST AVAILABLE VARIANT
    const availableVariant = product.variants.find(variant => variant.available) || product.variants[0];

    if (!availableVariant) {
    alert('This product has no available variants');
    return;
  }
    console.log(`Selected variant for ${product.title}:`, availableVariant);

    const newItem = {
      id: availableVariant.id,
      productId: product.id,
      handle: product.handle,
      title: product.title,
      variantTitle: availableVariant.title,
      price: parseFloat(availableVariant.price) * 100,
      formattedPrice: formatMoney(parseFloat(availableVariant.price) *100),
      sku: availableVariant.sku,
      image:
        product.images && product.images.length > 0
          ? product.images[0].src.replace(
              /\.(jpg|jpeg|png|gif|webp)/,
              "_200x200.$1"
            )
          : "",
    };

    selectedItems.push(newItem);

    updateSelectedItemDisplay(modal, selectedItems, bundleData);
    updateProductItemStates();

    console.log("Added product to bundle:", newItem.title);
  }

  function updateProductItemStates() {
    const productItems = productsGrid.querySelectorAll(".product-item");
    productItems.forEach((item) => {
      const productId = parseInt(item.dataset.productId);
      const isSelected = selectedItems.some(
        (selectedItem) => selectedItem.productId === productId
      );
      const addBtn = item.querySelector(".add-product-btn");

      if (isSelected) {
        item.classList.add("selected");
        addBtn.textContent = "Added";
        addBtn.disabled = true;
      } else {
        item.classList.remove("selected");
        addBtn.textContent = "Add";
        addBtn.disabled = selectedItems.length >= bundleData.maxItems;
      }
    });
  }

  //INITIALIZE MODAL
  populateCollectionFilter();
  updateSelectedItemDisplay(modal, selectedItems, bundleData);
  loadProducts(true);

  //SHOW MODAL
  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
  });

  preventBodyScroll();
  console.log("Modal initialized successfully");
}

function updateSelectedItemDisplay(modal, selectedItems, bundleData) {
  console.log("Updating selected items display", selectedItems);

  const selectedItemsList = modal.querySelector(".selected-items-list");
  const selectedCounts = modal.querySelectorAll(".selected-count");

  // UPDATE COUNTER
  selectedCounts.forEach((counter) => {
    counter.textContent = selectedItems.length;
  });

  // CLEAR EXISTING ITEMS
  selectedItemsList.innerHTML = "";

  if (selectedItems.length === 0) {
    selectedItemsList.innerHTML = '<p class="no-items">No items selected</p>';
  } else {
    selectedItems.forEach((item, index) => {
      const itemElement = document.createElement("div");
      itemElement.className = "selected-item";
      itemElement.dataset.productId = item.id;
      itemElement.dataset.itemIndex = index;

      let imageHtml = "";
      if (item.image && item.image.trim() !== "") {
        console.log(`Loading image`);

        imageHtml = `
            <img src="${item.image}"
              alt="${item.title}"
              width="60"
              height="60">
          `;
      } else {
        imageHtml = `<div class="no-image">No Image</div>`;
      }

      itemElement.innerHTML = `
          <div class="item-image">${imageHtml}</div>
          <div class="item-details">
            <div class="item-title">${item.title}</div>
            <div class="item-price">${item.formattedPrice}</div>
          </div>
          <button class="remove-item" type="button" data-product-id="${item.productId}" data-item-index="${index}">
            x
          </button>
        `;

      selectedItemsList.appendChild(itemElement);
    });

    // EVENT LISTENERS FOR REMOVE BUTTONS
    selectedItemsList.querySelectorAll(".remove-item").forEach((button) => {
      button.addEventListener("click", function (e) {
        const productId = parseInt(e.target.dataset.productId);
        const itemIndex = parseInt(e.target.dataset.itemIndex);

        console.log(`Removing item: ${productId} at index ${itemIndex}`);

        selectedItems.splice(itemIndex, 1);

        updateSelectedItemDisplay(modal, selectedItems, bundleData);
        updatePricingSummary(modal, selectedItems, bundleData);

        const productItems = modal.querySelectorAll(".product-item");
        productItems.forEach((item) => {
          const itemProductId = parseInt(item.dataset.productId);
          const addBtn = item.querySelector(".add-product-btn");

          if (itemProductId === productId) {
            item.classList.remove("selected");
            addBtn.textContent = "Add";
            addBtn.disabled = false;
          } else if (selectedItems.length < bundleData.maxItems) {
            addBtn.disabled = false;
          }
        });
      });
    });
  }

  updatePricingSummary(modal, selectedItems, bundleData);
}

function updatePricingSummary(modal, selectedItems, bundleData) {
  console.log("Updating pricing for ", selectedItems.length, " items");

  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const discountAmount = totalPrice * (bundleData.discount / 100);
  const finalPrice = totalPrice - discountAmount;

  const totalPriceElement = modal.querySelector(".total-price");
  const discountAmountElement = modal.querySelector(".discount-amount");
  const finalPriceElement = modal.querySelector(".final-price");
  const addToCartButton = modal.querySelector(".add-bundle-to-cart");

  totalPriceElement.textContent = `Total: ${formatMoney(totalPrice)}`;
  discountAmountElement.textContent = `Discount (${
    bundleData.discount
  }%): -${formatMoney(discountAmount)}`;
  finalPriceElement.textContent = `Bundle Price: ${formatMoney(finalPrice)}`;

  if (selectedItems.length > 0) {
    addToCartButton.disabled = false;
    addToCartButton.textContent = `Add Bundle to Cart (${selectedItems.length} items)`;
  } else {
    addToCartButton.disabled = true;
    addToCartButton.textContent = "Add Bundle to Cart";
  }
}

async function addBundleToCart(selectedItems, bundleData) {
  console.log("Adding bundle to cart: ", selectedItems, bundleData);

  if (selectedItems.length === 0) {
    alert("Please select sufficient items for your bundle");
    return;
  }

  const validationErrors = validateBundleItems(selectedItems);
  if (validationErrors.length > 0) {
    console.error("Validation errors:", validationErrors);
    alert("Some items have invalid data. Please refresh and try again.");
    return;
  }

  const addToCartButton = document.querySelector(".add-bundle-to-cart");
  const originalText = addToCartButton.textContent;

  // LOADING STATE
  addToCartButton.disabled = true;
  addToCartButton.textContent = "Adding to Cart...";

  try {
    const cartItems = selectedItems.map((item) => ({
      id: item.id,
      quantity: 1,
      properties: {
        _bundle_id: bundleData.bundleId,
        _bundle_name: bundleData.bundleName,
        _bundle_discount: bundleData.discount,
      },
    }));

    console.log("Cart items to add: ", cartItems);

    // USE SHOPIFY'S CART API
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cartItems,
      }),
    });
    const result = await response.json();

    if (response.ok) {
      console.log("Bundle added to cart successfully", result);

      addToCartButton.textContent = "Added to Cart!";
      addToCartButton.style.backgroundColor = "#4caf50";

      // DELAY CLOSE MODAL
      setTimeout(() => {
        restoreBodyScroll();
        document.querySelector(".bundle-modal").remove();
      }, 1500);
    } else {
      throw new Error(result.message || "Failed to add bundle to cart");
    }
  } catch (error) {
    console.log("Error adding bundle to cart: ", error);
    alert("There was an error adding the bundle to cart. Please try again.");

    addToCartButton.disabled = false;
    addToCartButton.textContent = originalText;
    addToCartButton.style.backgroundColor = "";
  }
}

async function debugCartState() {
  try {
    const response = await fetch('/cart.js');
    const cart = await response.json();
    console.log("Current cart state:", cart);
    return cart;
  } catch (error) {
    console.error("Error fetching cart:", error);
  }
}

// Optional: Function to validate items before adding to cart
function validateBundleItems(selectedItems) {
  const errors = [];
  
  selectedItems.forEach((item, index) => {
    if (!item.id || isNaN(item.id)) {
      errors.push(`Item ${index + 1} (${item.title}) has invalid variant ID`);
    }
    
    if (!item.title || item.title.trim() === '') {
      errors.push(`Item ${index + 1} has no title`);
    }
    
    if (!item.price || isNaN(item.price) || item.price <= 0) {
      errors.push(`Item ${index + 1} (${item.title}) has invalid price`);
    }
  });
  
  return errors;
}

function preventBodyScroll() {
  const scrollY = window.scrollY;

  document.body.classList.add('modal-open');
  document.body.dataset.scrollY = scrollY;
  document.body.style.top = `-${scrollY}px`;
}

function restoreBodyScroll() {
  document.body.classList.remove('modal-open');

  const scrollY = document.body.dataset.scrollY;
  document.body.style.top = '';
  delete document.body.dataset.scrollY;
  
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY));
  }
  
}