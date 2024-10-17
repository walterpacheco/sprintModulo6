// public/script.js

document.addEventListener('DOMContentLoaded', function() {
    const SERVER_URL = 'http://localhost:3000'; // Asegúrate de que esto coincida con tu servidor
    const addRoommateBtn = document.getElementById('addRoommate');
    const roommatesList = document.getElementById('roommatesList');
    const expenseForm = document.getElementById('expenseForm');
    const historyList = document.getElementById('historyList');
    const roommateSelect = document.getElementById('roommate');
    const editModal = document.getElementById('editModal');
    const closeButton = document.querySelector('.close-button');
    const editExpenseForm = document.getElementById('editExpenseForm');
    const editRoommateSelect = document.getElementById('editRoommate');

    /**
     * Función para obtener y mostrar los co-habitantes.
     */
    async function fetchRoommates() {
        try {
            const response = await fetch(`${SERVER_URL}/roommate`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const roommates = await response.json();
            renderRoommates(roommates);
        } catch (error) {
            console.error('Error fetching roommates:', error);
            alert('Error al cargar los co-habitantes. Por favor, intenta de nuevo.');
        }
    }

    /**
     * Función para renderizar los co-habitantes en la tabla y los selects.
     * @param {Array} roommates Arreglo de co-habitantes.
     */
    function renderRoommates(roommates) {
        roommatesList.innerHTML = '';
        roommateSelect.innerHTML = '<option value="">Selecciona un Co-habitante</option>';
        editRoommateSelect.innerHTML = '<option value="">Selecciona un Co-habitante</option>';

        roommates.forEach(roommate => {
            const debe = typeof roommate.debe === 'number' ? roommate.debe.toFixed(2) : '0.00';
            const recibe = typeof roommate.recibe === 'number' ? roommate.recibe.toFixed(2) : '0.00';

            roommatesList.innerHTML += `
                <tr>
                    <td>${roommate.name}</td>
                    <td>$${debe}</td>
                    <td>$${recibe}</td>
                </tr>
            `;

            roommateSelect.innerHTML += `<option value="${roommate.id}">${roommate.name}</option>`;
            editRoommateSelect.innerHTML += `<option value="${roommate.id}">${roommate.name}</option>`;
        });
    }

    /**
     * Función para obtener y mostrar los gastos.
     */
    async function fetchExpenses() {
        try {
            const response = await fetch(`${SERVER_URL}/gastos`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const gastos = await response.json();
            renderGastos(gastos);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            alert('Error al cargar los gastos. Por favor, intenta de nuevo.');
        }
    }

    /**
     * Función para renderizar los gastos en la tabla.
     * @param {Array} gastos Arreglo de gastos.
     */
    function renderGastos(gastos) {
        historyList.innerHTML = '';
        gastos.forEach(gasto => {
            const amount = typeof gasto.amount === 'number' ? gasto.amount.toFixed(2) : '0.00';
            historyList.innerHTML += `
                <tr>
                    <td>${gasto.roommateName || 'Desconocido'}</td>
                    <td>${gasto.description || ''}</td>
                    <td>$${amount}</td>
                    <td>
                        <button class="edit-btn" data-id="${gasto.id}">Editar</button>
                        <button class="delete-btn" data-id="${gasto.id}">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    }

    /**
     * Evento para agregar un nuevo co-habitante.
     */
    addRoommateBtn.addEventListener('click', async function() {
        try {
            const response = await fetch(`${SERVER_URL}/roommate`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}) // Sin payload
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const newRoommate = await response.json();
            console.log('Nuevo co-habitante agregado:', newRoommate);
            fetchRoommates();
        } catch (error) {
            console.error('Error al agregar nuevo co-habitante:', error);
            alert(`Error al agregar nuevo co-habitante: ${error.message}`);
        }
    });

    /**
     * Evento para registrar un nuevo gasto.
     */
    expenseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const expenseData = {
            roommate: roommateSelect.value,
            description: document.getElementById('description').value.trim(),
            amount: document.getElementById('amount').value
        };

        // Validar que el roommate esté seleccionado
        if (!expenseData.roommate) {
            alert('Por favor, selecciona un co-habitante.');
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/gasto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const newExpense = await response.json();
            console.log('Nuevo gasto registrado:', newExpense);
            fetchExpenses();
            fetchRoommates();
            expenseForm.reset();
        } catch (error) {
            console.error('Error al registrar nuevo gasto:', error);
            alert(`Error al registrar nuevo gasto: ${error.message}`);
        }
    });

    /**
     * Manejar eventos de clic en la tabla de gastos (Editar y Eliminar).
     */
    historyList.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
                deleteExpense(id);
            }
        }
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            openEditModal(id);
        }
    });

    /**
     * Función para eliminar un gasto.
     * @param {string} id ID del gasto a eliminar.
     */
    async function deleteExpense(id) {
        try {
            const response = await fetch(`${SERVER_URL}/gasto?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const result = await response.json();
            console.log(result.message);
            fetchExpenses();
            fetchRoommates();
        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            alert(`Error al eliminar gasto: ${error.message}`);
        }
    }

    /**
     * Función para abrir el modal de edición con los datos del gasto seleccionado.
     * @param {string} id ID del gasto a editar.
     */
    async function openEditModal(id) {
        try {
            const response = await fetch(`${SERVER_URL}/gasto/${id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }
            const gasto = await response.json();

            // Rellenar los campos del formulario de edición
            document.getElementById('editExpenseId').value = gasto.id;
            document.getElementById('editDescription').value = gasto.description;
            document.getElementById('editAmount').value = gasto.amount;
            editRoommateSelect.value = gasto.roommate;

            // Mostrar el modal
            editModal.style.display = 'block';
        } catch (error) {
            console.error('Error al obtener gasto para editar:', error);
            alert(`Error al obtener gasto: ${error.message}`);
        }
    }

    /**
     * Evento para cerrar el modal cuando se hace clic en la X.
     */
    closeButton.addEventListener('click', function() {
        editModal.style.display = 'none';
    });

    /**
     * Evento para cerrar el modal cuando se hace clic fuera del contenido del modal.
     */
    window.addEventListener('click', function(event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    });

    /**
     * Evento para actualizar un gasto existente.
     */
    editExpenseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('editExpenseId').value;
        const updatedExpense = {
            id,
            roommate: editRoommateSelect.value,
            description: document.getElementById('editDescription').value.trim(),
            amount: document.getElementById('editAmount').value
        };

        // Validar que el roommate esté seleccionado
        if (!updatedExpense.roommate) {
            alert('Por favor, selecciona un co-habitante.');
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/gasto`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedExpense)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const updatedGasto = await response.json();
            console.log('Gasto actualizado:', updatedGasto);
            fetchExpenses();
            fetchRoommates();
            editModal.style.display = 'none';
        } catch (error) {
            console.error('Error al actualizar gasto:', error);
            alert(`Error al actualizar gasto: ${error.message}`);
        }
    });

    // Inicializar la carga de roommates y gastos
    fetchRoommates();
    fetchExpenses();
});
