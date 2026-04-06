// Variables globales
let paintings = [];
let adminAuthenticated = false;
let adminPassword = '';

// Cargar todas las pinturas y comentarios al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadPaintings();
    initializeAdmin();
});

async function loadPaintings() {
    try {
        const response = await fetch('/api/paintings');
        if (!response.ok) throw new Error('Error cargando pinturas');
        
        paintings = await response.json();
        renderPaintings();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar las pinturas', 'error');
    }
}

function renderPaintings() {
    const gallery = document.querySelector('.gallery-grid');
    gallery.innerHTML = '';

    paintings.forEach(painting => {
        gallery.innerHTML += createPaintingCard(painting);
    });

    // Agregar event listeners a los formularios
    document.querySelectorAll('.comment-form').forEach((form) => {
        const paintingId = Number(form.dataset.paintingId);
        form.addEventListener('submit', (e) => handleCommentSubmit(e, paintingId));
    });

    // Agregar listeners para eliminar comentarios
    document.querySelectorAll('.comment-delete').forEach(button => {
        button.addEventListener('click', handleDeleteComment);
    });
}

function createPaintingCard(painting) {
    const commentsHTML = painting.comments
        .map(comment => createCommentHTML(comment))
        .join('');

    return `
        <article class="art-card">
            <div class="card-image">
                <img src="${painting.image_url}" alt="${painting.title}">
            </div>
            
            <div class="card-content">
                <h2 class="art-title">${painting.title}</h2>
                <p class="art-description">${painting.description}</p>
            </div>
            
            <div class="comments-section">
                <h3>Comentarios (${painting.comments.length})</h3>
                
                <div class="comments-list" data-painting-id="${painting.id}">
                    ${commentsHTML}
                </div>
                
                <form class="comment-form" data-painting-id="${painting.id}">
                    <input type="text" placeholder="Tu nombre" required maxlength="50">
                    <textarea placeholder="Escribe tu comentario..." rows="3" required maxlength="500"></textarea>
                    <button type="submit" class="submit-btn">Enviar comentario</button>
                </form>
            </div>
        </article>
    `;
}

function createCommentHTML(comment) {
    const date = new Date(comment.created_at);
    const formattedDate = formatDate(date);

    return `
        <div class="comment" data-comment-id="${comment.id}" data-painting-id="${comment.painting_id}">
            <div class="comment-header">
                <strong>${escapeHTML(comment.author)}</strong>
                <span class="comment-date">${formattedDate}</span>
            </div>
            <p class="comment-text">${escapeHTML(comment.comment)}</p>
            <button type="button" class="comment-delete" data-comment-id="${comment.id}" data-painting-id="${comment.painting_id}">Eliminar</button>
        </div>
    `;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'hace unos segundos';
    if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES');
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleCommentSubmit(e, paintingId) {
    e.preventDefault();

    const form = e.target;
    const author = form.querySelector('input[type="text"]').value.trim();
    const comment = form.querySelector('textarea').value.trim();

    if (!author || !comment) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        const response = await fetch(`/api/paintings/${paintingId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ author, comment })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar comentario');
        }

        const newComment = await response.json();

        // Actualizar la pintura en el array
        const paintingIndex = paintings.findIndex(p => p.id === paintingId);
        if (paintingIndex !== -1) {
            if (!Array.isArray(paintings[paintingIndex].comments)) {
                paintings[paintingIndex].comments = [];
            }
            paintings[paintingIndex].comments.unshift(newComment);
        }

        // Actualizar el UI
        const commentsList = document.querySelector(`.comments-list[data-painting-id="${paintingId}"]`);
        if (commentsList) {
            const newCommentHTML = createCommentHTML(newComment);
            commentsList.innerHTML = newCommentHTML + commentsList.innerHTML;

            const card = form.closest('.art-card');
            const title = card.querySelector('.comments-section h3');
            const count = paintingIndex !== -1 ? paintings[paintingIndex].comments.length : card.querySelectorAll('.comments-list .comment').length;
            title.textContent = `Comentarios (${count})`;
        }

        // Limpiar formulario
        form.reset();
        showNotification('¡Comentario enviado correctamente!', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error al enviar comentario', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar comentario';
    }
}

async function handleDeleteComment(event) {
    const button = event.currentTarget;
    const commentId = button.dataset.commentId;
    const paintingId = Number(button.dataset.paintingId);

    if (!adminAuthenticated || !adminPassword) {
        showNotification('Necesitas iniciar sesión como admin para eliminar comentarios', 'error');
        return;
    }

    if (!confirm('¿Eliminar este comentario? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar comentario');
        }

        // Actualizar datos en memoria
        const paintingIndex = paintings.findIndex(p => p.id === paintingId);
        if (paintingIndex !== -1 && Array.isArray(paintings[paintingIndex].comments)) {
            paintings[paintingIndex].comments = paintings[paintingIndex].comments.filter(c => String(c.id) !== String(commentId));
        }

        const commentElement = button.closest('.comment');
        if (commentElement) {
            commentElement.remove();
        }

        const card = button.closest('.art-card');
        const title = card.querySelector('.comments-section h3');
        const count = paintingIndex !== -1 ? paintings[paintingIndex].comments.length : card.querySelectorAll('.comments-list .comment').length;
        title.textContent = `Comentarios (${count})`;

        showNotification('Comentario eliminado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error al eliminar comentario', 'error');
    }
}

function showNotification(message, type) {
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;

    // Agregar animación
    if (!document.querySelector('style[data-notification-styles]')) {
        const style = document.createElement('style');
        style.setAttribute('data-notification-styles', '');
        style.innerHTML = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== FUNCIONES DE ADMINISTRACIÓN ====================

function initializeAdmin() {
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminModal = document.getElementById('closeAdminModal');
    const loginForm = document.getElementById('loginForm');
    const addPaintingForm = document.getElementById('addPaintingForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Verificar si el admin ya está autenticado desde localStorage
    if (localStorage.getItem('adminAuthenticated') === 'true') {
        adminAuthenticated = true;
        adminPassword = localStorage.getItem('adminPassword') || '';
        document.body.classList.add('admin-active');
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        loadPaintingsList();
        renderPaintings();
    }

    // Abrir modal de admin
    adminBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
    });

    // Cerrar modal
    closeAdminModal.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });

    // Cerrar modal al hacer click fuera
    window.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            closeAdminModal.click();
        }
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;

        if (!password) {
            showNotification('Por favor ingresa una contraseña', 'error');
            return;
        }

        // Enviar contraseña al servidor para validarla
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                throw new Error('Contraseña incorrecta');
            }

            adminAuthenticated = true;
            adminPassword = password;
            document.body.classList.add('admin-active');
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loginForm.reset();
            showNotification('¡Bienvenido Admin!', 'success');
            // Guardar en localStorage
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminPassword', adminPassword);
            loadPaintingsList();
            renderPaintings();
        } catch (error) {
            showNotification(error.message || 'Contraseña incorrecta', 'error');
            document.getElementById('adminPassword').value = '';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        adminAuthenticated = false;
        document.body.classList.remove('admin-active');
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('adminLogin').classList.remove('hidden');
        loginForm.reset();
        showNotification('Sesión cerrada', 'success');
        // Limpiar localStorage
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminPassword');
    });

    // Agregar nueva pintura
    addPaintingForm.addEventListener('submit', handleAddPainting);

    // Vista previa de imagen
    const fileInput = document.getElementById('paintingImage');
    fileInput.addEventListener('change', handleImagePreview);

    // Hacer clickeable el label del archivo
    const fileLabel = document.querySelector('.file-label');
    fileLabel.addEventListener('click', () => fileInput.click());
    fileLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileLabel.style.background = 'rgba(52, 152, 219, 0.15)';
    });
    fileLabel.addEventListener('dragleave', () => {
        fileLabel.style.background = 'rgba(52, 152, 219, 0.05)';
    });
    fileLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileLabel.style.background = 'rgba(52, 152, 219, 0.05)';
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleImagePreview({ target: { files: e.dataTransfer.files } });
        }
    });
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const fileLabel = document.querySelector('.file-label');

    if (file) {
        // Mostrar nombre del archivo
        fileLabel.textContent = file.name;

        // Mostrar vista previa
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        fileLabel.textContent = 'Selecciona una imagen (JPG, PNG, GIF, WebP)';
    }
}

async function handleAddPainting(e) {
    e.preventDefault();

    const title = document.getElementById('paintingTitle').value.trim();
    const description = document.getElementById('paintingDescription').value.trim();
    const fileInput = document.getElementById('paintingImage');
    const file = fileInput.files[0];

    if (!title || !description || !file) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    // Validar tamaño de archivo
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showNotification('La imagen es demasiado grande (máximo 5MB)', 'error');
        return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Tipo de archivo no permitido. Usa: JPG, PNG, GIF o WebP', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subiendo imagen...';

    try {
        // Crear FormData para enviar archivo
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', file);
        formData.append('password', adminPassword);

        const response = await fetch('/api/paintings', {
            method: 'POST',
            body: formData
            // No incluir Content-Type, el navegador lo establecerá automáticamente
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al agregar pintura');
        }

        const newPainting = await response.json();
        paintings.unshift(newPainting);

        renderPaintings();
        loadPaintingsList();
        e.target.reset();
        document.getElementById('imagePreview').style.display = 'none';

        showNotification('¡Pintura agregada exitosamente!', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error al agregar pintura', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Agregar Pintura';
    }
}

function loadPaintingsList() {
    const paintingsList = document.getElementById('paintingsList');
    paintingsList.innerHTML = '<h3>Tus Pinturas</h3>';

    paintings.forEach(painting => {
        const paintingItem = document.createElement('div');
        paintingItem.className = 'painting-item';
        paintingItem.innerHTML = `
            <div class="painting-item-info">
                <img src="${painting.image_url}" alt="${painting.title}" onerror="this.src='https://via.placeholder.com/80x80?text=Error'">
                <div>
                    <h4>${escapeHTML(painting.title)}</h4>
                    <p>${painting.comments.length} comentarios</p>
                </div>
            </div>
            <button class="btn-delete" onclick="deletePainting(${painting.id})">🗑️ Eliminar</button>
        `;
        paintingsList.appendChild(paintingItem);
    });
}

async function deletePainting(paintingId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta pintura? Se eliminarán todos sus comentarios.')) {
        return;
    }

    try {
        const response = await fetch(`/api/paintings/${paintingId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar pintura');
        }

        paintings = paintings.filter(p => p.id !== paintingId);
        renderPaintings();
        loadPaintingsList();

        showNotification('Pintura eliminada correctamente', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error al eliminar pintura', 'error');
    }
}
