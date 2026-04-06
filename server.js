import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configurar multer para carga de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para la imagen
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname);
        cb(null, `painting_${timestamp}_${random}${ext}`);
    }
});

// Filtrar solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WebP)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Inicializar base de datos
const dbPath = path.join(__dirname, 'comments.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
    } else {
        console.log('Base de datos conectada correctamente');
        initializeDatabase();
    }
});

// Inicializar tablas
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS paintings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creando tabla paintings:', err);
        else console.log('Tabla paintings lista');
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            painting_id INTEGER NOT NULL,
            author TEXT NOT NULL,
            comment TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (painting_id) REFERENCES paintings(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creando tabla comments:', err);
        else console.log('Tabla comments lista');
        insertDefaultPaintings();
    });
}

// Insertar pinturas por defecto
function insertDefaultPaintings() {
    const paintings = [
        {
            title: 'Título de la Pintura',
            description: 'Esta es una descripción de la pintura. Puedes escribir detalles sobre la técnica utilizada, los colores, la inspiración y cualquier otra información relevante sobre la obra.',
            image_url: 'https://via.placeholder.com/300x300?text=Pintura+1'
        },
        {
            title: 'Otra Pintura Hermosa',
            description: 'Descripción de la segunda obra de arte. Cada pintura tiene su propia historia y significado. Comparte tus pensamientos en los comentarios.',
            image_url: 'https://via.placeholder.com/300x300?text=Pintura+2'
        },
        {
            title: 'Obra Maestra',
            description: 'Tercera pieza de la colección. Cada una representa una parte de mi proceso creativo y forma de ver el mundo.',
            image_url: 'https://via.placeholder.com/300x300?text=Pintura+3'
        }
    ];

    db.get('SELECT COUNT(*) as count FROM paintings', (err, row) => {
        if (err) {
            console.error('Error:', err);
            return;
        }
        
        if (row.count === 0) {
            paintings.forEach(painting => {
                db.run(
                    'INSERT INTO paintings (title, description, image_url) VALUES (?, ?, ?)',
                    [painting.title, painting.description, painting.image_url],
                    (err) => {
                        if (err) console.error('Error insertando pintura:', err);
                    }
                );
            });
            console.log('Pinturas por defecto insertadas');
        }
    });
}

// ==================== RUTAS ====================

// POST autenticación de admin
app.post('/api/auth', (req, res) => {
    const { password } = req.body;

    if (!password || password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Contraseña incorrecta' });
        return;
    }

    res.json({ success: true, message: 'Autenticación exitosa' });
});

// GET todas las pinturas con sus comentarios
app.get('/api/paintings', (req, res) => {
    db.all(
        `SELECT * FROM paintings ORDER BY created_at DESC`,
        (err, paintings) => {
            if (err) {
                res.status(500).json({ error: 'Error obteniendo pinturas' });
                return;
            }

            if (paintings.length === 0) {
                res.json([]);
                return;
            }

            // Obtener comentarios para cada pintura
            Promise.all(
                paintings.map(painting => {
                    return new Promise((resolve, reject) => {
                        db.all(
                            `SELECT * FROM comments WHERE painting_id = ? ORDER BY created_at DESC`,
                            [painting.id],
                            (err, comments) => {
                                if (err) reject(err);
                                else resolve({ ...painting, comments: comments || [] });
                            }
                        );
                    });
                })
            )
            .then(paintingsWithComments => {
                res.json(paintingsWithComments);
            })
            .catch(err => {
                res.status(500).json({ error: 'Error obteniendo comentarios' });
            });
        }
    );
});

// GET comentarios de una pintura específica
app.get('/api/paintings/:id/comments', (req, res) => {
    const { id } = req.params;
    
    db.all(
        `SELECT * FROM comments WHERE painting_id = ? ORDER BY created_at DESC`,
        [id],
        (err, comments) => {
            if (err) {
                res.status(500).json({ error: 'Error obteniendo comentarios' });
                return;
            }
            res.json(comments);
        }
    );
});

// POST nuevo comentario
app.post('/api/paintings/:id/comments', (req, res) => {
    const { id } = req.params;
    const { author, comment } = req.body;

    // Validaciones
    if (!author || !comment) {
        res.status(400).json({ error: 'Nombre y comentario son requeridos' });
        return;
    }

    if (author.trim().length === 0 || comment.trim().length === 0) {
        res.status(400).json({ error: 'Nombre y comentario no pueden estar vacíos' });
        return;
    }

    if (author.length > 50) {
        res.status(400).json({ error: 'El nombre es demasiado largo' });
        return;
    }

    if (comment.length > 500) {
        res.status(400).json({ error: 'El comentario es demasiado largo (máximo 500 caracteres)' });
        return;
    }

    db.run(
        `INSERT INTO comments (painting_id, author, comment) VALUES (?, ?, ?)`,
        [id, author.trim(), comment.trim()],
        function(err) {
            if (err) {
                console.error('Error insertando comentario:', err);
                res.status(500).json({ error: 'Error guardando comentario' });
                return;
            }

            res.status(201).json({
                id: this.lastID,
                painting_id: id,
                author: author.trim(),
                comment: comment.trim(),
                created_at: new Date().toISOString()
            });
        }
    );
});

// DELETE comentario
app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body || {};

    if (password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Contraseña incorrecta' });
        return;
    }

    db.run(
        `DELETE FROM comments WHERE id = ?`,
        [id],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Error eliminando comentario' });
                return;
            }
            res.json({ success: true });
        }
    );
});

// POST nueva pintura (administrador)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'benlli123';

app.post('/api/paintings', upload.single('image'), (req, res) => {
    const { title, description, password } = req.body;

    // Verificar contraseña de admin
    if (password !== ADMIN_PASSWORD) {
        // Eliminar imagen si fue cargada
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error eliminando archivo:', err);
            });
        }
        res.status(401).json({ error: 'Contraseña incorrecta' });
        return;
    }

    // Validaciones
    if (!title || !description) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error eliminando archivo:', err);
            });
        }
        res.status(400).json({ error: 'Todos los campos son requeridos' });
        return;
    }

    if (!req.file) {
        res.status(400).json({ error: 'Debes seleccionar una imagen' });
        return;
    }

    if (title.trim().length === 0 || description.trim().length === 0) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error eliminando archivo:', err);
        });
        res.status(400).json({ error: 'Los campos no pueden estar vacíos' });
        return;
    }

    if (title.length > 100) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error eliminando archivo:', err);
        });
        res.status(400).json({ error: 'El título es demasiado largo (máximo 100 caracteres)' });
        return;
    }

    if (description.length > 1000) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error eliminando archivo:', err);
        });
        res.status(400).json({ error: 'La descripción es demasiado larga (máximo 1000 caracteres)' });
        return;
    }

    // Construir URL de la imagen
    const image_url = `/uploads/${req.file.filename}`;

    db.run(
        `INSERT INTO paintings (title, description, image_url) VALUES (?, ?, ?)`,
        [title.trim(), description.trim(), image_url],
        function(err) {
            if (err) {
                console.error('Error insertando pintura:', err);
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error eliminando archivo:', err);
                });
                res.status(500).json({ error: 'Error guardando pintura' });
                return;
            }

            res.status(201).json({
                id: this.lastID,
                title: title.trim(),
                description: description.trim(),
                image_url: image_url,
                created_at: new Date().toISOString(),
                comments: []
            });
        }
    );
});

// DELETE pintura (administrador)
app.delete('/api/paintings/:id', (req, res) => {
    const { password } = req.body || {};

    if (password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Contraseña incorrecta' });
        return;
    }

    const { id } = req.params;

    // Primero obtener la pintura para saber qué archivo eliminar
    db.get('SELECT image_url FROM paintings WHERE id = ?', [id], (err, painting) => {
        if (err) {
            res.status(500).json({ error: 'Error obteniendo información de la pintura' });
            return;
        }

        // Eliminar comentarios asociados
        db.run(`DELETE FROM comments WHERE painting_id = ?`, [id], (err) => {
            if (err) {
                res.status(500).json({ error: 'Error eliminando comentarios' });
                return;
            }

            // Eliminar pintura de la base de datos
            db.run(`DELETE FROM paintings WHERE id = ?`, [id], function(err) {
                if (err) {
                    res.status(500).json({ error: 'Error eliminando pintura' });
                    return;
                }

                // Eliminar archivo de imagen si es local
                if (painting && painting.image_url && painting.image_url.startsWith('/uploads/')) {
                    const filename = painting.image_url.replace('/uploads/', '');
                    const filepath = path.join(uploadsDir, filename);
                    
                    fs.unlink(filepath, (err) => {
                        if (err && err.code !== 'ENOENT') {
                            console.error('Error eliminando archivo:', err);
                        }
                    });
                }

                res.json({ success: true });
            });
        });
    });
});

// GET al servidor
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🎨 Servidor BenlliArt ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Base de datos: ${dbPath}\n`);
});
