/* ==========================================================
   CONFIGURACION
   ========================================================== */

var WA_NUMBER = '543815411429';

/* ==========================================================
   RENDERIZADO DINAMICO DE PRODUCTOS
   ========================================================== */

function formatearPrecio(num) {
    return '$' + Number(num).toLocaleString('es-AR');
}

function generarHTMLCard(p, isSlider, cardId) {
    var cardClass = isSlider ? 'productos__card' : 'imperdibles__card';
    var ofertaHTML = p.oferta
        ? '<img class="' + cardClass + '__oferta" src="assets/vectores/oferta.svg" alt="Oferta" loading="lazy">'
        : '';
    var idAttr = cardId ? ' id="' + cardId + '"' : '';
    var imgHTML = '<img src="' + p.imagen + '" alt="' + p.nombre + '"'
        + ' onerror="this.style.display=\'none\';this.parentNode.setAttribute(\'data-sin-img\',\'1\')">';
    return '<article class="' + cardClass + '"' + idAttr + '>' +
        ofertaHTML +
        '<h3 class="' + cardClass + '__nombre">' + p.nombre + '</h3>' +
        '<div class="' + cardClass + '__imagen">' + imgHTML + '</div>' +
        '<p class="' + cardClass + '__descripcion">' + p.descripcion + '</p>' +
        '<p class="' + cardClass + '__precio">' + formatearPrecio(p.precio) + '</p>' +
        '<button class="' + cardClass + '__boton" type="button">Agregar a mi pedido</button>' +
        '</article>';
}

function renderProducts() {
    if (typeof PRODUCTOS_CATALOGO === 'undefined') return;

    /* Seleccionar ~12 ofertas al azar */
    var indices = Array.from({ length: PRODUCTOS_CATALOGO.length }, function (_, i) { return i; });
    indices.sort(function () { return 0.5 - Math.random(); });
    var indicesOferta = indices.slice(0, 12);

    PRODUCTOS_CATALOGO.forEach(function (p, i) {
        p.oferta = indicesOferta.indexOf(i) !== -1;
    });

    /* Inyectar carrusel de Destacadas */
    var destacadasHTML = '';
    PRODUCTOS_CATALOGO.filter(function (p) { return p.oferta; }).forEach(function (p) {
        destacadasHTML += generarHTMLCard(p, true);
    });
    document.getElementById('destacadasTrack').innerHTML = destacadasHTML;

    /* Inyectar grilla de productos por categoria */
    var categoriasPermitidas = ['Bolsas', 'Envases', 'Bandejas', 'Film y láminas', 'Papelería'];
    var imperdiblesHTML = '';

    categoriasPermitidas.forEach(function (cat) {
        var prods = PRODUCTOS_CATALOGO.filter(function (p) { return p.categoria === cat; });
        if (prods.length > 0) {
            var catId = cat.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/ /g, '-');
            prods.forEach(function (p, index) {
                var cardId = (index === 0) ? 'cat-' + catId : null;
                imperdiblesHTML += generarHTMLCard(p, false, cardId);
            });
        }
    });

    document.getElementById('productosGrid').innerHTML = imperdiblesHTML;
}


/* ==========================================================
   OBSERVADORES DE INTERSECCION - Animaciones de aparicion
   ========================================================== */

var seccionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            var cards = entry.target.querySelectorAll('[class$="__card"]');
            cards.forEach(function (card, i) {
                setTimeout(function () {
                    card.classList.add(card.className.replace('__card', '__card__visible').split(' ').pop());
                }, i * 90);
            });
            seccionObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

var gridObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('imperdibles__card__visible');
            gridObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

function initObservers() {
    var productosTrack = document.querySelector('.productos__track');
    if (productosTrack) seccionObserver.observe(productosTrack);

    var imperdiblesCards = document.querySelectorAll('.imperdibles__card');
    imperdiblesCards.forEach(function (card, index) {
        card.style.transitionDelay = '0ms';
        gridObserver.observe(card);
    });
}


/* ==========================================================
   FUNCION FACTORIA DE SLIDER - Reutilizable sin librerias
   ========================================================== */

function iniciarSlider(config) {
    var track = config.track;
    var flechaIzq = config.flechaIzq;
    var flechaDer = config.flechaDer;
    var autoplayMs = config.autoplayMs || 4000;
    var animMs = config.animMs || 380;
    var cards = Array.from(track.children);

    var currentIndex = 0;
    var isDragging = false;
    var startX = 0;
    var startY = 0;
    var currentTranslate = 0;
    var prevTranslate = 0;
    var autoplayTimer = null;
    var animFrameId = null;
    var movedHorizontally = false;

    function getVisibleCount() {
        if (window.innerWidth >= 768) return config.desktopVisible || 5;
        return config.mobileVisible || 2;
    }

    function getStep() {
        if (cards.length === 0) return 1;
        var w = cards[0].offsetWidth;
        var style = getComputedStyle(track);
        var g = parseInt(style.gap) || 12;
        return w + g;
    }

    function getMaxIndex() {
        return Math.max(0, cards.length - getVisibleCount());
    }

    function animarHacia(target) {
        var inicio = currentTranslate;
        var diff = target - inicio;
        var tiempoInicio = performance.now();
        if (animFrameId) cancelAnimationFrame(animFrameId);
        function paso(now) {
            var elapsed = now - tiempoInicio;
            var progreso = Math.min(elapsed / animMs, 1);
            var eased = 1 - Math.pow(1 - progreso, 3);
            currentTranslate = inicio + diff * eased;
            track.style.transform = 'translateX(' + currentTranslate + 'px)';
            if (progreso < 1) animFrameId = requestAnimationFrame(paso);
        }
        animFrameId = requestAnimationFrame(paso);
    }

    function irA(index) {
        var maxIdx = getMaxIndex();
        currentIndex = Math.max(0, Math.min(index, maxIdx));
        animarHacia(-(currentIndex * getStep()));
    }

    function snapAlMasCercano() {
        var step = getStep();
        var diff = currentTranslate - prevTranslate;
        var threshold = step * 0.18;
        if (Math.abs(diff) > threshold) {
            irA(currentIndex + (diff < 0 ? 1 : -1));
        } else {
            irA(currentIndex);
        }
    }

    function onTouchStart(e) {
        isDragging = true;
        movedHorizontally = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        prevTranslate = currentTranslate;
        pausarAutoplay();
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (!movedHorizontally && Math.abs(dx) > Math.abs(dy) + 4) movedHorizontally = true;
        if (movedHorizontally) {
            e.preventDefault();
            currentTranslate = prevTranslate + dx;
            track.style.transform = 'translateX(' + currentTranslate + 'px)';
        }
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        if (movedHorizontally) snapAlMasCercano();
        reanudarAutoplay();
    }

    function onMouseDown(e) {
        isDragging = true;
        movedHorizontally = false;
        startX = e.clientX;
        prevTranslate = currentTranslate;
        pausarAutoplay();
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDragging) return;
        movedHorizontally = true;
        currentTranslate = prevTranslate + (e.clientX - startX);
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = '';
        if (movedHorizontally) snapAlMasCercano();
        reanudarAutoplay();
    }

    function iniciarAutoplay() {
        pausarAutoplay();
        autoplayTimer = setInterval(function () {
            irA(currentIndex >= getMaxIndex() ? 0 : currentIndex + 1);
        }, autoplayMs);
    }

    function pausarAutoplay() {
        if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    function reanudarAutoplay() { iniciarAutoplay(); }

    flechaIzq.addEventListener('click', function () { irA(currentIndex - 1); reanudarAutoplay(); });
    flechaDer.addEventListener('click', function () { irA(currentIndex + 1); reanudarAutoplay(); });

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    track.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { irA(currentIndex); }, 150);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) pausarAutoplay(); else reanudarAutoplay();
    });

    iniciarAutoplay();

    return { irA: irA, pausar: pausarAutoplay, reanudar: reanudarAutoplay };
}


/* ==========================================================
   INICIALIZAR SLIDERS
   ========================================================== */

var sliderDestacadas;

function initSlider() {
    sliderDestacadas = iniciarSlider({
        track: document.querySelector('.productos__track'),
        flechaIzq: document.querySelector('.productos__flecha__izquierda'),
        flechaDer: document.querySelector('.productos__flecha__derecha'),
        mobileVisible: 2,
        desktopVisible: 5,
        autoplayMs: 3500,
        animMs: 400
    });
}


/* ==========================================================
   CATEGORIAS - Boton activo y scroll suave
   ========================================================== */

function initCategorias() {
    var categoriaBotones = document.querySelectorAll('.categorias__boton');
    var header = document.querySelector('.header');

    categoriaBotones.forEach(function (boton) {
        boton.addEventListener('click', function () {
            categoriaBotones.forEach(function (b) { b.classList.remove('categorias__boton__activo'); });
            boton.classList.add('categorias__boton__activo');

            var target = boton.getAttribute('data-target');
            if (target === 'todo') {
                var imperdibles = document.querySelector('.imperdibles');
                if (imperdibles) {
                    var headerH = header ? header.offsetHeight : 0;
                    var top = imperdibles.getBoundingClientRect().top + window.scrollY - headerH - 10;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                }
            } else {
                var section = document.getElementById('cat-' + target);
                if (section) {
                    var headerH = header ? header.offsetHeight : 0;
                    var top = section.getBoundingClientRect().top + window.scrollY - headerH - 12;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                }
            }
        });
    });
}


/* ==========================================================
   BOTON FLOTANTE "VER PEDIDO"
   ========================================================== */

function initPedidoFlotante() {
    var pedidoBtn = document.querySelector('.header__pedido');
    var header = document.querySelector('.header');
    window.addEventListener('scroll', function () {
        if (window.scrollY > header.offsetHeight) {
            pedidoBtn.classList.add('header__pedido--flotante');
        } else {
            pedidoBtn.classList.remove('header__pedido--flotante');
        }
    });
}


/* ==========================================================
   LIGHTBOX - Agregar a mi pedido
   ========================================================== */

var lightboxCantidad = document.getElementById('lightboxCantidad');
var lightboxConfirmacion = document.getElementById('lightboxConfirmacion');
var lightboxProducto = document.getElementById('lightboxProducto');
var lightboxInput = document.getElementById('lightboxInput');
var lightboxPrecioUnitario = document.getElementById('lightboxPrecioUnitario');
var lightboxTotal = document.getElementById('lightboxTotal');
var lightboxCancelar = document.getElementById('lightboxCancelar');
var lightboxAceptar = document.getElementById('lightboxAceptar');
var lightboxCerrar = document.getElementById('lightboxCerrarConfirmacion');

var productoActual = '';
var precioActual = 0;
var pedidos = [];

function actualizarTotal() {
    var cant = parseInt(lightboxInput.value) || 1;
    lightboxTotal.textContent = formatearPrecio(precioActual * cant);
}

function abrirLightboxCantidad(nombre, precio) {
    productoActual = nombre;
    precioActual = precio;
    lightboxProducto.textContent = nombre;
    lightboxPrecioUnitario.textContent = formatearPrecio(precio);
    lightboxInput.value = 1;
    actualizarTotal();
    lightboxCantidad.classList.add('lightbox-overlay--visible');
    if (sliderDestacadas) sliderDestacadas.pausar();
}

function cerrarLightboxCantidad() {
    lightboxCantidad.classList.remove('lightbox-overlay--visible');
}

function abrirLightboxConfirmacion() {
    cerrarLightboxCantidad();
    setTimeout(function () {
        lightboxConfirmacion.classList.add('lightbox-overlay--visible');
    }, 200);
}

function cerrarLightboxConfirmacion() {
    lightboxConfirmacion.classList.remove('lightbox-overlay--visible');
    if (sliderDestacadas) sliderDestacadas.reanudar();
}

document.querySelector('.lightbox__btn--mas').addEventListener('click', function () {
    lightboxInput.value = parseInt(lightboxInput.value) + 1;
    actualizarTotal();
});

document.querySelector('.lightbox__btn--menos').addEventListener('click', function () {
    var v = parseInt(lightboxInput.value);
    if (v > 1) { lightboxInput.value = v - 1; actualizarTotal(); }
});

lightboxCancelar.addEventListener('click', function () {
    cerrarLightboxCantidad();
    if (sliderDestacadas) sliderDestacadas.reanudar();
});

lightboxAceptar.addEventListener('click', function () {
    var encontrado = false;
    for (var i = 0; i < pedidos.length; i++) {
        if (pedidos[i].nombre === productoActual) {
            pedidos[i].cantidad += parseInt(lightboxInput.value);
            encontrado = true;
            break;
        }
    }
    if (!encontrado) {
        pedidos.push({ nombre: productoActual, precio: precioActual, cantidad: parseInt(lightboxInput.value) });
    }
    actualizarBadge();
    abrirLightboxConfirmacion();
});

lightboxCerrar.addEventListener('click', cerrarLightboxConfirmacion);

lightboxCantidad.addEventListener('click', function (e) {
    if (e.target === lightboxCantidad) { cerrarLightboxCantidad(); if (sliderDestacadas) sliderDestacadas.reanudar(); }
});
lightboxConfirmacion.addEventListener('click', function (e) {
    if (e.target === lightboxConfirmacion) cerrarLightboxConfirmacion();
});


/* ==========================================================
   BOTONES AGREGAR A PEDIDO Y CONSULTAS (DELEGACIÓN DE EVENTOS)
   ========================================================== */

function initBotonesAgregar() {
    document.addEventListener('click', function (e) {
        var btnAgregar = e.target.closest('.productos__card__boton, .imperdibles__card__boton');
        if (btnAgregar) {
            var card = btnAgregar.closest('article');
            if (!card) return;
            var nombre = card.querySelector('.productos__card__nombre, .imperdibles__card__nombre').textContent.trim();
            var precioTexto = card.querySelector('.productos__card__precio, .imperdibles__card__precio').textContent.trim();
            var precioNum = parseFloat(precioTexto.replace(/[^0-9]/g, ''));
            abrirLightboxCantidad(nombre, precioNum);
            return;
        }

        var btnConsultar = e.target.closest('.card__consultar');
        if (btnConsultar) {
            var card = btnConsultar.closest('article');
            if (!card) return;
            var nombre = card.querySelector('.productos__card__nombre, .imperdibles__card__nombre').textContent.trim();
            window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hola, quiero consultar sobre: ' + nombre), '_blank');
            return;
        }
    });
}


/* ==========================================================
   BOTON CONSULTAR WHATSAPP (SOLO INYECCION)
   ========================================================== */

function initWhatsapp() {
    document.querySelectorAll('.productos__card, .imperdibles__card').forEach(function (card) {
        if (card.querySelector('.card__consultar')) return;
        var botonAgregar = card.querySelector('.productos__card__boton, .imperdibles__card__boton');
        if (!botonAgregar) return;

        var consultarBtn = document.createElement('button');
        consultarBtn.className = 'card__consultar';
        consultarBtn.type = 'button';
        consultarBtn.innerHTML = 'Consultar <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/></svg>';
        botonAgregar.parentNode.insertBefore(consultarBtn, botonAgregar);
    });
}


/* ==========================================================
   VER PEDIDO - Lightbox y logica
   ========================================================== */

var pedidoLista = document.getElementById('pedidoLista');
var lightboxPedido = document.getElementById('lightboxPedido');
var pedidoVolver = document.getElementById('pedidoVolver');
var pedidoEnviar = document.getElementById('pedidoEnviar');

function actualizarBadge() {
    var badge = document.querySelector('.header__pedido__badge');
    if (badge) badge.textContent = pedidos.length;
}

function abrirLightboxPedido() {
    renderizarPedidos();
    lightboxPedido.classList.add('lightbox-overlay--visible');
    if (sliderDestacadas) sliderDestacadas.pausar();
}

function cerrarLightboxPedido() {
    lightboxPedido.classList.remove('lightbox-overlay--visible');
    if (sliderDestacadas) sliderDestacadas.reanudar();
}

function renderizarPedidos() {
    if (pedidos.length === 0) {
        pedidoLista.innerHTML = '<p class="lightbox__pedido__vacio">No agregaste productos aun</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        var subtotal = p.precio * p.cantidad;
        html += '<div class="pedido-item" data-index="' + i + '">';
        html += '<div class="pedido-item__nombre">' + p.nombre + '</div>';
        html += '<div class="pedido-item__row">';
        html += '<button class="pedido-item__btn pedido-item__btn--menos" type="button">−</button>';
        html += '<span class="pedido-item__cantidad">' + p.cantidad + '</span>';
        html += '<button class="pedido-item__btn pedido-item__btn--mas" type="button">+</button>';
        html += '<span class="pedido-item__subtotal">' + formatearPrecio(subtotal) + '</span>';
        html += '<button class="pedido-item__eliminar" type="button">✕</button>';
        html += '</div></div>';
    }
    pedidoLista.innerHTML = html;
}

document.querySelector('.header__pedido').addEventListener('click', function (e) {
    e.stopPropagation();
    abrirLightboxPedido();
});

pedidoLista.addEventListener('click', function (e) {
    var target = e.target;
    var item = target.closest('.pedido-item');
    if (!item) return;
    var index = parseInt(item.dataset.index);
    if (isNaN(index)) return;
    if (target.classList.contains('pedido-item__btn--mas')) {
        pedidos[index].cantidad++; actualizarBadge(); renderizarPedidos();
    } else if (target.classList.contains('pedido-item__btn--menos')) {
        if (pedidos[index].cantidad > 1) { pedidos[index].cantidad--; actualizarBadge(); renderizarPedidos(); }
    } else if (target.classList.contains('pedido-item__eliminar')) {
        pedidos.splice(index, 1); actualizarBadge(); renderizarPedidos();
    }
});

pedidoVolver.addEventListener('click', cerrarLightboxPedido);
pedidoEnviar.addEventListener('click', function () {
    if (pedidos.length === 0) return;
    var mensaje = '_*Nuevo Pedido!*_\n';
    var total = 0;
    for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        var subtotal = p.precio * p.cantidad;
        mensaje += '\u25A0 ' + p.cantidad + ' ' + p.nombre + ' - $' + Number(subtotal).toLocaleString('es-AR') + ' \n';
        total += subtotal;
    }
    mensaje += '\n_*Total: $' + Number(total).toLocaleString('es-AR') + '*_';
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(mensaje), '_blank');
    pedidos = [];
    actualizarBadge();
    cerrarLightboxPedido();
});

lightboxPedido.addEventListener('click', function (e) {
    if (e.target === lightboxPedido) cerrarLightboxPedido();
});


/* ==========================================================
   BUSCADOR EN TIEMPO REAL
   ========================================================== */

function initBuscador() {
    var buscador = document.querySelector('.buscador');
    if (!buscador) return;
    buscador.addEventListener('input', function () {
        var texto = buscador.value.toLowerCase().trim();
        document.querySelectorAll('.imperdibles__card').forEach(function (card) {
            var nombre = card.querySelector('.imperdibles__card__nombre').textContent.toLowerCase();
            var descripcion = card.querySelector('.imperdibles__card__descripcion').textContent.toLowerCase();
            var coincide = nombre.indexOf(texto) !== -1 || descripcion.indexOf(texto) !== -1;
            card.style.display = (texto === '' || coincide) ? '' : 'none';
        });
        /* Ocultar/mostrar titulos de categoria si todos sus hijos estan ocultos */
        document.querySelectorAll('.categoria-titulo').forEach(function (titulo) {
            var next = titulo.nextElementSibling;
            var hayVisible = false;
            while (next && !next.classList.contains('categoria-titulo')) {
                if (next.style.display !== 'none') { hayVisible = true; break; }
                next = next.nextElementSibling;
            }
            titulo.style.display = hayVisible || texto === '' ? '' : 'none';
        });
    });
}


/* ==========================================================
   ARRANQUE PRINCIPAL
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
    renderProducts();
    initObservers();
    initSlider();
    initCategorias();
    initPedidoFlotante();
    initBotonesAgregar();
    initWhatsapp();
    initBuscador();
});
