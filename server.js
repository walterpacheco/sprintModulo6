// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { getRandomUser } = require('./randomUser');
const { v4: uuidv4 } = require('uuid'); // Asegúrate de importar uuid


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas y Archivos
const ROOMMATES_FILE = path.join(__dirname, 'roommates.json');
const GASTOS_FILE = path.join(__dirname, 'gastos.json');

/**
 * Helper para leer un archivo JSON.
 * @param {string} filePath Ruta del archivo.
 * @returns {Promise<Array>} Contenido del archivo como arreglo.
 */
async function readJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Si el archivo no existe, devolver un arreglo vacío
            return [];
        }
        throw error;
    }
}

/**
 * Helper para escribir en un archivo JSON.
 * @param {string} filePath Ruta del archivo.
 * @param {Array} data Datos a escribir.
 */
async function writeJSONFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        throw error;
    }
}

/**
 * Función para recalcular y actualizar las cuentas de los roommates.
 */
async function recalcularBalances() {
    console.log('Recalculando balances...');
    try {
        const gastos = await readJSONFile(GASTOS_FILE);
        const roommates = await readJSONFile(ROOMMATES_FILE);

        // Resetear los balances
        roommates.forEach(r => {
            r.debe = 0;
            r.recibe = 0;
        });

        const totalRoommates = roommates.length;
        console.log(`Total de co-habitantes: ${totalRoommates}`);
        if (totalRoommates === 0) {
            throw new Error('No hay roommates para asignar los gastos');
        }

        // Recalcular los balances
        gastos.forEach(gasto => {
            const splitAmount = gasto.amount / totalRoommates;
            roommates.forEach(roommate => {
                if (roommate.id === gasto.roommate) {
                    roommate.recibe += gasto.amount - splitAmount;
                } else {
                    roommate.debe += splitAmount;
                }
            });
        });

        await writeJSONFile(ROOMMATES_FILE, roommates);
        console.log('Balances recalculados exitosamente.');
    } catch (error) {
        console.error('Error recalculando balances:', error);
        throw error;
    }
}

// Ruta raíz para servir el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para agregar un nuevo roommate
app.post('/roommate', async (req, res) => {
    try {
        // Obtener un nuevo roommate usando randomUser
        const newRoommate = await getRandomUser();
        console.log('Nuevo roommate obtenido:', newRoommate);

        // Leer los roommates existentes
        const roommates = await readJSONFile(ROOMMATES_FILE);
        console.log(`Cantidad de roommates antes de agregar: ${roommates.length}`);

        // Agregar el nuevo roommate
        roommates.push(newRoommate);
        console.log('Roommate agregado:', newRoommate);

        // Escribir de vuelta al archivo
        await writeJSONFile(ROOMMATES_FILE, roommates);
        console.log('Roommates actualizados en roommates.json');

        res.status(201).json(newRoommate);
    } catch (error) {
        console.error('Error al agregar roommate:', error);
        res.status(500).json({ error: 'Failed to add new roommate' });
    }
});

// Ruta para obtener todos los roommates
app.get('/roommate', async (req, res) => {
    try {
        const roommates = await readJSONFile(ROOMMATES_FILE);
        console.log(`Obteniendo ${roommates.length} roommates.`);
        res.status(200).json(roommates);
    } catch (error) {
        console.error('Error al obtener roommates:', error);
        res.status(500).json({ error: 'Failed to get roommates' });
    }
});

// Ruta para obtener todos los gastos
app.get('/gastos', async (req, res) => {
    try {
        const gastos = await readJSONFile(GASTOS_FILE);
        const roommates = await readJSONFile(ROOMMATES_FILE);

        // Agregar el nombre del roommate a cada gasto
        const gastosConNombre = gastos.map(gasto => {
            const roommate = roommates.find(r => r.id === gasto.roommate);
            return {
                ...gasto,
                roommateName: roommate ? roommate.name : 'Desconocido'
            };
        });

        console.log(`Obteniendo ${gastosConNombre.length} gastos.`);
        res.status(200).json(gastosConNombre);
    } catch (error) {
        console.error('Error al obtener gastos:', error);
        res.status(500).json({ error: 'Failed to get expenses' });
    }
});

// Ruta para agregar un nuevo gasto
app.post('/gasto', async (req, res) => {
    try {
        const { roommate, description, amount } = req.body;
        console.log('Datos recibidos para nuevo gasto:', req.body);

        // Validaciones
        if (!roommate || typeof roommate !== 'string') {
            console.warn('Roommate ID inválido:', roommate);
            return res.status(400).json({ error: 'Roommate ID es requerido y debe ser una cadena válida' });
        }
        if (!description || typeof description !== 'string' || description.trim() === '') {
            console.warn('Descripción inválida:', description);
            return res.status(400).json({ error: 'Descripción es requerida y debe ser una cadena válida' });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.warn('Monto inválido:', amount);
            return res.status(400).json({ error: 'Monto inválido. Debe ser un número positivo' });
        }

        // Verificar que el roommate exista
        const roommates = await readJSONFile(ROOMMATES_FILE);
        const roommateExists = roommates.some(r => r.id === roommate);
        if (!roommateExists) {
            console.warn('Roommate no encontrado:', roommate);
            return res.status(400).json({ error: 'Roommate no encontrado' });
        }

        // Crear el nuevo gasto
        const newGasto = {
            id: uuidv4(),
            roommate,
            description: description.trim(),
            amount: parsedAmount
        };
        console.log('Nuevo gasto creado:', newGasto);

        // Leer los gastos existentes
        const gastos = await readJSONFile(GASTOS_FILE);
        console.log(`Cantidad de gastos antes de agregar: ${gastos.length}`);

        // Agregar el nuevo gasto
        gastos.push(newGasto);
        console.log('Gasto agregado:', newGasto);

        // Escribir de vuelta al archivo
        await writeJSONFile(GASTOS_FILE, gastos);
        console.log('Gastos actualizados en gastos.json');

        // Recalcular balances
        await recalcularBalances();

        res.status(201).json(newGasto);
    } catch (error) {
        console.error('Error al agregar gasto:', error);
        res.status(500).json({ error: 'Failed to add new expense' });
    }
});

// Ruta para actualizar un gasto
app.put('/gasto', async (req, res) => {
    try {
        const { id, roommate, description, amount } = req.body;
        console.log('Datos recibidos para actualizar gasto:', req.body);

        // Validaciones
        if (!id || typeof id !== 'string') {
            console.warn('Gasto ID inválido:', id);
            return res.status(400).json({ error: 'Gasto ID es requerido y debe ser una cadena válida' });
        }
        if (!roommate || typeof roommate !== 'string') {
            console.warn('Roommate ID inválido:', roommate);
            return res.status(400).json({ error: 'Roommate ID es requerido y debe ser una cadena válida' });
        }
        if (!description || typeof description !== 'string' || description.trim() === '') {
            console.warn('Descripción inválida:', description);
            return res.status(400).json({ error: 'Descripción es requerida y debe ser una cadena válida' });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.warn('Monto inválido:', amount);
            return res.status(400).json({ error: 'Monto inválido. Debe ser un número positivo' });
        }

        // Verificar que el roommate exista
        const roommates = await readJSONFile(ROOMMATES_FILE);
        const roommateExists = roommates.some(r => r.id === roommate);
        if (!roommateExists) {
            console.warn('Roommate no encontrado:', roommate);
            return res.status(400).json({ error: 'Roommate no encontrado' });
        }

        // Leer los gastos existentes
        const gastos = await readJSONFile(GASTOS_FILE);
        const gastoIndex = gastos.findIndex(g => g.id === id);
        if (gastoIndex === -1) {
            console.warn('Gasto no encontrado:', id);
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        // Actualizar el gasto
        gastos[gastoIndex] = {
            id,
            roommate,
            description: description.trim(),
            amount: parsedAmount
        };
        console.log('Gasto actualizado:', gastos[gastoIndex]);

        // Escribir de vuelta al archivo
        await writeJSONFile(GASTOS_FILE, gastos);
        console.log('Gastos actualizados en gastos.json');

        // Recalcular balances
        await recalcularBalances();

        res.status(200).json(gastos[gastoIndex]);
    } catch (error) {
        console.error('Error al actualizar gasto:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Ruta para eliminar un gasto
app.delete('/gasto', async (req, res) => {
    try {
        const { id } = req.query;
        console.log('Solicitud para eliminar gasto con ID:', id);

        if (!id || typeof id !== 'string') {
            console.warn('Gasto ID inválido:', id);
            return res.status(400).json({ error: 'Gasto ID es requerido y debe ser una cadena válida' });
        }

        // Leer los gastos existentes
        const gastos = await readJSONFile(GASTOS_FILE);
        const gastoIndex = gastos.findIndex(g => g.id === id);
        if (gastoIndex === -1) {
            console.warn('Gasto no encontrado:', id);
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        // Eliminar el gasto
        const eliminado = gastos.splice(gastoIndex, 1);
        console.log('Gasto eliminado:', eliminado[0]);

        // Escribir de vuelta al archivo
        await writeJSONFile(GASTOS_FILE, gastos);
        console.log('Gastos actualizados en gastos.json');

        // Recalcular balances
        await recalcularBalances();

        res.status(200).json({ message: 'Gasto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// Ruta para obtener todos los roommates (alias de /roommate GET)
app.get('/roommates', async (req, res) => {
    try {
        const roommates = await readJSONFile(ROOMMATES_FILE);
        console.log(`Obteniendo ${roommates.length} roommates.`);
        res.status(200).json(roommates);
    } catch (error) {
        console.error('Error al obtener roommates:', error);
        res.status(500).json({ error: 'Failed to get roommates' });
    }
});

// Ruta para obtener un gasto por ID
app.get('/gasto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Obteniendo gasto con ID:', id);

        const gastos = await readJSONFile(GASTOS_FILE);
        const gasto = gastos.find(g => g.id === id);
        if (!gasto) {
            console.warn('Gasto no encontrado:', id);
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        const roommates = await readJSONFile(ROOMMATES_FILE);
        const roommate = roommates.find(r => r.id === gasto.roommate);
        gasto.roommateName = roommate ? roommate.name : 'Desconocido';

        res.status(200).json(gasto);
    } catch (error) {
        console.error('Error al obtener gasto:', error);
        res.status(500).json({ error: 'Failed to get expense' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
