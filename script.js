// Імпортуємо модулі Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// !!! ВСТАВ СВОЇ ДАНІ З FIREBASE ЗАМІСТЬ ЦИХ РЯДКІВ !!!
const firebaseConfig = {
    apiKey: "AIzaSyAfugpmfb82r7migKduV9uCNgiCWL1dd1M",
    authDomain: "teamlogika.firebaseapp.com",
    databaseURL: "https://teamlogika-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "teamlogika",
    storageBucket: "teamlogika.firebasestorage.app",
    messagingSenderId: "318507708334",
    appId: "1:318507708334:web:5fdce39f1ce7bc3992223f"
};
// Ініціалізація Firebase
const app = initializeApp(firebaseConfig);
const dbRef = getDatabase(app);

let db = {};
let currentUser = null;
let currentGroup = null;

// МАГІЯ РЕАЛЬНОГО ЧАСУ: Firebase постійно слухає зміни в базі
onValue(ref(dbRef, 'julyPlansDB'), (snapshot) => {
    db = snapshot.val() || {};

    // Якщо відкрита дошка вчителя або учня - вона оновиться автоматично!
    if (document.getElementById('screen-teacher-board').classList.contains('active')) {
        window.showTeacherBoard();
    } else if (document.getElementById('screen-student-board').classList.contains('active')) {
        window.showStudentBoard();
    }
});

// Оскільки ми використовуємо type="module", всі функції потрібно прив'язати до window, щоб HTML їх бачив
window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

window.login = async function() {
    const groupInput = document.getElementById('class-code').value.trim().toUpperCase();
    const nameInput = document.getElementById('username').value.trim();
    const passInput = document.getElementById('user-password').value.trim();

    if (!groupInput || !nameInput || !passInput) {
        alert("Будь ласка, заповніть всі 3 поля!");
        return;
    }
    
    currentGroup = groupInput;
    currentUser = nameInput;
    
    // Перевіряємо чи існує такий учень у базі
    if (!db[currentGroup] || !db[currentGroup][currentUser]) {
        // Створюємо нового учня
        if (!db[currentGroup]) db[currentGroup] = {};
        db[currentGroup][currentUser] = {
            password: passInput,
            tasks: []
        }; 
        await window.saveData(); 
        
        document.getElementById('welcome-text').innerText = `Привіт, ${currentUser}!`;
        window.clearLoginFields();
        window.showScreen('screen-add-plans'); 
    } else {
        // Учень існує - перевірка пароля
        if (db[currentGroup][currentUser].password === passInput) {
            window.clearLoginFields();
            document.getElementById('board-title').innerText = `Дошка: ${currentUser}`;
            window.showStudentBoard(); 
        } else {
            alert("Неправильний пароль! Спробуй ще раз.");
        }
    }
}

window.clearLoginFields = function() {
    document.getElementById('class-code').value = '';
    document.getElementById('username').value = '';
    document.getElementById('user-password').value = '';
}

window.showTeacherLogin = function() {
    window.showScreen('screen-teacher-login');
}

window.verifyTeacher = function() {
    const groupInput = document.getElementById('teacher-class-code').value.trim().toUpperCase();
    const passInput = document.getElementById('teacher-password').value;
    
    if (!groupInput) {
        alert("Введіть код групи!");
        return;
    }

    if (passInput === 'summer26') {
        currentGroup = groupInput;
        document.getElementById('teacher-class-code').value = '';
        document.getElementById('teacher-password').value = '';
        
        if (db[currentGroup]) {
            document.getElementById('teacher-board-title').innerText = `Група: ${currentGroup}`;
            window.showTeacherBoard();
        } else {
            alert("Такої групи ще не існує. Учні мають спочатку зареєструватися.");
        }
    } else {
        alert("Неправильний пароль вчителя!");
        document.getElementById('teacher-password').value = '';
    }
}

window.addPlan = async function() {
    const title = document.getElementById('plan-title').value.trim();
    const category = document.getElementById('plan-category').value;
    const start = document.getElementById('plan-start').value;
    const end = document.getElementById('plan-end').value;
    const notes = document.getElementById('plan-notes').value.trim();

    if (!title) {
        alert("Назва завдання є обов'язковою!");
        return;
    }

    const newTask = {
        id: Date.now(),
        title,
        category,
        start,
        end,
        notes,
        completed: false 
    };

    if (!db[currentGroup][currentUser].tasks) {
        db[currentGroup][currentUser].tasks = [];
    }
    
    // Зберігаємо локально для відображення
    db[currentGroup][currentUser].tasks.push(newTask);
    
    // БЛОК ПЕРЕВІРКИ ПОМИЛОК
    try {
        await window.saveData(); // Відправка у Firebase
        
        // Якщо помилки немає, цей код виконається і все очиститься:
        document.getElementById('plan-title').value = '';
        document.getElementById('plan-notes').value = '';
        document.getElementById('plan-start').value = '';
        document.getElementById('plan-end').value = '';
        document.getElementById('plan-category').value = 'Навчання';
        
        alert("Завдання успішно додано!");
        
    } catch (error) {
        // Якщо Firebase заблокував запис, вилізе ця помилка:
        alert("🚨 Завдання не відправлено в базу! Firebase блокує запис. Зайди в консоль Firebase -> Realtime Database -> вкладка Rules. Там обов'язково має бути \".write\": \"true\"");
        console.error(error);
    }
}

window.showStudentBoard = function() {
    const container = document.getElementById('student-tasks-container');
    container.innerHTML = '';
    
    // Безпечне отримання завдань
    const tasks = db[currentGroup]?.[currentUser]?.tasks || [];
    
    if (tasks.length === 0) {
        container.innerHTML = '<p>У тебе поки немає завдань.</p>';
    } else {
        tasks.forEach((task, index) => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskEl.style.flexDirection = 'column';
            taskEl.style.alignItems = 'flex-start';
            
            taskEl.innerHTML = `
                <div class="task-header">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">${task.category}</div>
                    </div>
                </div>
                <button class="task-details-btn" onclick="toggleDetails('details-${index}')">Розгорнути деталі 🔽</button>
                <div id="details-${index}" class="task-expanded-content">
                    <strong>Нотатки:</strong> ${task.notes ? task.notes : 'Немає нотаток'}<br>
                    <strong>Початок:</strong> ${task.start ? task.start : 'Не вказано'}<br>
                    <strong>Дедлайн:</strong> ${task.end ? task.end : 'Не вказано'}
                </div>
            `;
            container.appendChild(taskEl);
        });
    }
    
    window.showScreen('screen-student-board');
}

window.toggleDetails = function(elementId) {
    const el = document.getElementById(elementId);
    el.classList.toggle('show');
}

window.toggleTask = async function(taskIndex) {
    db[currentGroup][currentUser].tasks[taskIndex].completed = !db[currentGroup][currentUser].tasks[taskIndex].completed;
    await window.saveData(); 
    // Нам не потрібно вручну викликати showStudentBoard(), бо спрацює onValue!
}

window.showTeacherBoard = function() {
    const container = document.getElementById('teacher-overview');
    container.innerHTML = '';
    
    if (!db[currentGroup]) return;

    const students = Object.keys(db[currentGroup]);
    
    if (students.length === 0) {
        container.innerHTML = '<p>У групі ще немає учнів.</p>';
    } else {
        students.forEach(student => {
            const tasks = db[currentGroup][student].tasks || []; 
            const completedCount = tasks.filter(t => t.completed).length;
            
            let tasksHTML = tasks.map(t => 
                `<li>${t.completed ? '✅' : '⏳'} ${t.title}</li>`
            ).join('');

            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            studentCard.innerHTML = `
                <div class="student-name">${student} (Виконано: ${completedCount}/${tasks.length})</div>
                <ul style="list-style: none; font-size: 16px; margin-left: 10px; line-height: 1.6;">
                    ${tasksHTML}
                </ul>
            `;
            container.appendChild(studentCard);
        });
    }
    
    window.showScreen('screen-teacher-board');
}

window.saveData = async function() {
    // Відправляємо дані на сервери Google Firebase
    await set(ref(dbRef, 'julyPlansDB'), db);
}

window.logout = function() {
    currentUser = null;
    currentGroup = null;
    window.showScreen('screen-login');
}
