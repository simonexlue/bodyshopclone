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
  };
}

function handleBundleCardClick(bundleData) {
  // **TEMP** LOG DATA + SHOW ALERT
  // **FUTURE**  OPEN CUSTOMIZATION MODAL

  console.log("Opening bundle customizer for: ", bundleData);

  // alert(`
  //   Bundle: ${bundleData.bundleName}
  //   Max Items: ${bundleData.maxItems}
  //   Discount: ${bundleData.discount}%
  //   Default Items: ${bundleData.defaultItems.length}
  // `)

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
        <div class = "bundle-info">
          <p>Max Items: ${bundleData.maxItems}</p>
          <p>Discount: ${bundleData.discount}</p>
          <p>Default Items: ${bundleData.defaultItems.length}</p>
        </div>

        <div class = "bundle-customizer">
          <div class = "selected-items">
            <h3>Selected Items (${bundleData.defaultItems.length}/${bundleData.maxItems})</h3>
            <div class = "selected-items-list">
              <!-- Items will be populated here -->
            </div>
          </div>

          <div class = "available-products">
            <h3>Choose Your Products</h3>
            <p>(Product selection in later step)</p>
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

  // MODAL ELEMENTS
  const closeButton = modal.querySelector(".close-modal");
  const overlay = modal.querySelector(".bundle-modal-overlay");
  const modalContent = modal.querySelector(".bundle-modal-content");

  // CLOSE MODAL
  function closeModal() {
    console.log("Closing modal");
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

  //SHOW MODAL
  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
  });

  console.log("Modal initialized successfully");
}

function debugSelectedItems(selectedItems) {
  console.log("=== DEBUGGING SELECTED ITEMS ===");
  selectedItems.forEach((item, index) => {
    console.log(`Item ${index + 1}:`, {
      id: item.id,
      title: item.title,
      image: item.image,
      imageType: typeof item.image,
      hasImage: !!item.image,
      price: item.price,
      formattedPrice: item.formattedPrice,
    });
  });
  console.log("=== END DEBUG ===");
}

function updateSelectedItemDisplay(modal, selectedItems, bundleData) {
  console.log("Updating selected items display", selectedItems);

  debugSelectedItems(selectedItems);

  const selectedItemsList = modal.querySelector(".selected-items-list");
  const selectedCount = modal.querySelector(".selected-count");

  // UPDATE COUNTER
  if (selectedCount) {
    selectedCount.textContent = selectedItems.length;
  }

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
            <div class="no-image" style="display:none;">No Image</div>
          `;
      } else {
        imageHtml = `<div class="no-image">No Image</div>`;
      }

      itemElement.innerHTML = 
        `
          <div class="item-image">${imageHtml}</div>
          <div class="item-details">
            <div class="item-title">${item.title}</div>
            <div class="item-price">${item.formattedPrice}</div>
          </div>
          <button class="remove-item" type="button" data-product-id="${item.id}" data-item-index="${index}">
            Remove
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

console.log("Bundle Builder step 3: loaded");
