/* XTREME cart (localStorage) */
(() => {
  const STORAGE_KEY = "xtreme_cart_v1";

  /** @typedef {{id:string,name:string,sku:string,price:number,image:string,size?:string,color?:string,qty:number}} CartItem */

  const PRODUCTS = {
    midnight: { id: "midnight", name: "Худи “Midnight”", sku: "HW-001", price: 3990, image: "images/hoodie.jpg" },
    core:     { id: "core",     name: "Футболка “Core”",  sku: "TS-014", price: 1490, image: "images/tshirt.jpg" },
    street:   { id: "street",   name: "Брюки “Street Fit”", sku: "PT-221", price: 2990, image: "images/pants.jpg" },
  };

  function rub(n) {
    // format like "3 990 ₽"
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${s} ₽`;
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(x => x && typeof x.id === "string" && typeof x.qty === "number");
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateCartBadges(items);
  }

  function cartCount(items) {
    return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }

  function updateCartBadges(items = loadCart()) {
    const n = cartCount(items);
    document.querySelectorAll(".cart-count").forEach(el => (el.textContent = String(n)));
  }

  function addToCart(item) {
    const items = loadCart();
    const key = `${item.id}__${item.size || ""}__${item.color || ""}`;
    const idx = items.findIndex(it => `${it.id}__${it.size || ""}__${it.color || ""}` === key);

    if (idx >= 0) {
      items[idx].qty = Math.min(999, (Number(items[idx].qty) || 0) + (Number(item.qty) || 1));
    } else {
      items.push({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: Number(item.price) || 0,
        image: item.image,
        size: item.size || "",
        color: item.color || "",
        qty: Math.min(999, Math.max(1, Number(item.qty) || 1)),
      });
    }
    saveCart(items);
    toast(`Добавлено в корзину: ${item.name}`);
  }

  function removeFromCart(index) {
    const items = loadCart();
    items.splice(index, 1);
    saveCart(items);
    renderCartPage();
    renderCheckoutSummary();
  }

  function setQty(index, qty) {
    const items = loadCart();
    if (!items[index]) return;
    items[index].qty = Math.min(999, Math.max(1, Number(qty) || 1));
    saveCart(items);
    renderCartPage();
    renderCheckoutSummary();
  }

  function clearCart() {
    saveCart([]);
    renderCartPage();
    renderCheckoutSummary();
  }

  function calcTotals(items) {
    const subtotal = items.reduce((sum, it) => sum + (it.price * it.qty), 0);
    // Demo discount rule: if subtotal >= 5000 => 400 ₽ discount (like in mock)
    const discount = subtotal >= 5000 ? 400 : 0;
    const shipping = 0;
    const total = Math.max(0, subtotal + shipping - discount);
    return { subtotal, discount, shipping, total };
  }

  // --- UI helpers ---
  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("toast--show");
    window.clearTimeout(el._t);
    el._t = window.setTimeout(() => el.classList.remove("toast--show"), 2000);
  }

  function wireAddButtons() {
    document.querySelectorAll("[data-add-to-cart]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();

        const id = btn.getAttribute("data-product-id");
        const base = PRODUCTS[id];
        if (!base) return;

        const scopeSel = btn.getAttribute("data-scope") || "document";
        const scope = scopeSel === "closest-article" ? btn.closest("article") : document;

        const size = scope.querySelector("[data-cart-size]")?.value || "";
        const color = scope.querySelector("[data-cart-color]")?.value || "";
        const qty = scope.querySelector("[data-cart-qty]")?.value || 1;

        addToCart({ ...base, size, color, qty });
      });
    });
  }

  function renderCartPage() {
    const tbody = document.querySelector("#cart-items");
    const empty = document.querySelector("#cart-empty");
    const box = document.querySelector("#cart-box");

    if (!tbody || !empty || !box) return; // not on cart page

    const items = loadCart();
    updateCartBadges(items);

    tbody.innerHTML = "";

    if (items.length === 0) {
      empty.hidden = false;
      box.hidden = true;
      return;
    }

    empty.hidden = true;
    box.hidden = false;

    items.forEach((it, idx) => {
      const tr = document.createElement("tr");
      const params = [it.size ? `Размер: ${it.size}` : null, it.color ? `Цвет: ${it.color}` : null]
        .filter(Boolean).join(" • ") || "—";

      tr.innerHTML = `
        <td>
          <div class="cart-item">
            <img class="cart-item__img" src="${it.image}" alt="" />
            <div>
              <strong>${escapeHtml(it.name)}</strong><br />
              <span class="small">Артикул: ${escapeHtml(it.sku)}</span>
            </div>
          </div>
        </td>
        <td class="small">${escapeHtml(params)}</td>
        <td><strong>${rub(it.price)}</strong></td>
        <td>
          <div class="qtybox">
            <button class="qtybtn" type="button" data-qty-dec="${idx}" aria-label="Уменьшить">−</button>
            <input class="qty qtyinput" type="number" min="1" value="${it.qty}" data-qty-input="${idx}" />
            <button class="qtybtn" type="button" data-qty-inc="${idx}" aria-label="Увеличить">+</button>
          </div>
          <button class="btn btn-link btn-sm" type="button" data-remove="${idx}">Удалить</button>
        </td>
        <td><strong>${rub(it.price * it.qty)}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    // totals
    const { subtotal, discount, shipping, total } = calcTotals(items);
    setText("#subtotal", rub(subtotal));
    setText("#discount", discount ? `- ${rub(discount)}` : "0 ₽");
    setText("#shipping", rub(shipping));
    setText("#total", rub(total));

    // handlers
    tbody.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => removeFromCart(Number(btn.getAttribute("data-remove"))));
    });

    tbody.querySelectorAll("[data-qty-dec]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-qty-dec"));
        const items = loadCart();
        setQty(i, (items[i]?.qty || 1) - 1);
      });
    });

    tbody.querySelectorAll("[data-qty-inc]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-qty-inc"));
        const items = loadCart();
        setQty(i, (items[i]?.qty || 1) + 1);
      });
    });

    tbody.querySelectorAll("[data-qty-input]").forEach(inp => {
      inp.addEventListener("change", () => setQty(Number(inp.getAttribute("data-qty-input")), inp.value));
    });

    const clearBtn = document.querySelector("#cart-clear");
    if (clearBtn) clearBtn.onclick = () => clearCart();
  }

  function renderCheckoutSummary() {
    const list = document.querySelector("#checkout-items");
    const totals = document.querySelector("#checkout-totals");
    if (!list || !totals) return; // not on checkout page

    const items = loadCart();
    updateCartBadges(items);

    list.innerHTML = "";
    if (items.length === 0) {
      list.innerHTML = `<p class="small">Корзина пуста. <a class="btn btn-link" href="index.html">Перейти в каталог</a></p>`;
      totals.hidden = true;
      return;
    }
    totals.hidden = false;

    items.forEach(it => {
      const line = document.createElement("div");
      const params = [it.size ? it.size : null, it.color ? it.color : null].filter(Boolean).join(" • ");
      line.className = "total-row";
      line.innerHTML = `<span>${escapeHtml(it.name)} × ${it.qty}${params ? ` <span class="small">(${escapeHtml(params)})</span>` : ""}</span><strong>${rub(it.price * it.qty)}</strong>`;
      list.appendChild(line);
    });

    const { subtotal, discount, shipping, total } = calcTotals(items);
    setText("#checkout-subtotal", rub(subtotal));
    setText("#checkout-discount", discount ? `- ${rub(discount)}` : "0 ₽");
    setText("#checkout-shipping", rub(shipping));
    setText("#checkout-total", rub(total));
  }

  function wireCheckoutSubmit() {
    const form = document.querySelector("form[data-checkout-form]");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      // Demo: prevent real submit, show message & clear
      e.preventDefault();
      clearCart();
      toast("Заказ оформлен (демо). Корзина очищена.");
      form.reset();
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function setText(sel, value) {
    const el = document.querySelector(sel);
    if (el) el.textContent = value;
  }

  // init
  document.addEventListener("DOMContentLoaded", () => {
    updateCartBadges();
    wireAddButtons();
    renderCartPage();
    renderCheckoutSummary();
    wireCheckoutSubmit();
  });
})();
