� Cómo agregar pinturas:

1. Abre en el navegador: http://localhost:3000
2. Haz click en el botón "⚙️ Admin" (esquina superior derecha)
3. Ingresa la contraseña: benlli123
4. Completa el formulario:
   - Título: Nombre de tu obra
   - Descripción: Describe tu pintura
   - Imagen: Selecciona una imagen de tu computadora

📁 Opción 1: Clic para seleccionar
   - Haz click en la zona que dice "Selecciona una imagen..."
   - Elige el archivo de tu computadora
   - Verás una vista previa

🎯 Opción 2: Arrastra y suelta (Drag & Drop)
   - Arrastra una imagen desde tu carpeta
   - Suéltala en la zona de carga
   - Confirmará automáticamente

✅ Formatos soportados:
   - JPG / JPEG
   - PNG
   - GIF
   - WebP

📏 Límites:
   - Máximo 5MB por imagen
   - Máximo 100 caracteres en el título
   - Máximo 1000 caracteres en la descripción

🔐 PANEL DE ADMINISTRACIÓN
===========================

Contraseña actual: benlli123

📸 Cómo agregar pinturas:

1. Abre en el navegador: http://localhost:3000
2. Haz click en el botón "⚙️ Admin" (esquina superior derecha)
3. Ingresa la contraseña: benlli123
4. Completa el formulario:
   - Título: Nombre de tu obra
   - Descripción: Describe tu pintura
   - Imagen: Selecciona una imagen de tu computadora

📁 Opción 1: Clic para seleccionar
   - Haz click en la zona que dice "Selecciona una imagen..."
   - Elige el archivo de tu computadora
   - Verás una vista previa

🎯 Opción 2: Arrastra y suelta (Drag & Drop)
   - Arrastra una imagen desde tu carpeta
   - Suéltala en la zona de carga
   - Se cargará automáticamente

✅ Formatos soportados:
   - JPG / JPEG
   - PNG
   - GIF
   - WebP

📏 Límites:
   - Máximo 5MB por imagen
   - Máximo 100 caracteres en el título
   - Máximo 1000 caracteres en la descripción

📝 Cómo cambiar la contraseña:

1. Abre el archivo "server.js" con un editor de texto
2. Busca la línea: const ADMIN_PASSWORD = 'benlli123';
3. Reemplaza 'benlli123' con tu contraseña deseada
4. Guarda el archivo
5. Reinicia el servidor: npm start

⚠️ IMPORTANTE: Cambiar la contraseña también en "main.js"
- Busca: if (password === 'benlli123')
- Cambia por tu nueva contraseña
- Hay dos lugares donde aparece esta contraseña en main.js

💡 Tips:

- La contraseña se verifica en tiempo real
- Las imágenes se guardan en la carpeta "uploads/" del servidor
- Usa imágenes de buena calidad para mejores resultados
- Las imágenes se cargan al servidor automáticamente
- No necesitas subir a imgur o imgbb - ¡guárdalas localmente!

📁 Ubicación de imágenes:
   - Las imágenes subidas se guardan en: /uploads/
   - Se generan nombres únicos automáticamente
   - No se pueden saturar porque se limpia al reiniciar (opcional)

🗑️ Al eliminar una pintura:
- Se elimina la pintura
- Se eliminarán todos sus comentarios
- Se ELIMINA la imagen del servidor
- No se puede deshacer - ¡cuidado!

1. Abre el archivo "server.js" con un editor de texto
2. Busca la línea: const ADMIN_PASSWORD = 'benlli123';
3. Reemplaza 'benlli123' con tu contraseña deseada
4. Guarda el archivo
5. Reinicia el servidor: npm start

⚠️ IMPORTANTE: Cambiar la contraseña también en "main.js"
- Busca: if (password === 'benlli123')
- Cambia por tu nueva contraseña
- Hay dos lugares donde aparece esta contraseña en main.js

💡 Tips:

- La contraseña se verifica en tiempo real
- Las imágenes se guardan en la carpeta "uploads/" del servidor
- Usa imágenes de buena calidad para mejores resultados
- Las imágenes se cargan al servidor automáticamente
- No necesitas subir a imgur o imgbb - ¡guárdalas localmente!

📁 Ubicación de imágenes:
   - Las imágenes subidas se guardan en: /uploads/
   - Se generan nombres únicos automáticamente
   - No se pueden saturar porque se limpia al reiniciar (opcional)

🗑️ Al eliminar una pintura:
- Se elimina la pintura
- Se eliminarán todos sus comentarios
- Se ELIMINA la imagen del servidor
- No se puede deshacer - ¡cuidado!
