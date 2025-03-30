document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const activityInput = document.getElementById('activityInput');
    const categorySelect = document.getElementById('categorySelect');
    const prioritySelect = document.getElementById('prioritySelect');
    const tagsInput = document.getElementById('tagsInput');
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const addBtn = document.getElementById('addBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const saveDayBtn = document.getElementById('saveDayBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const activitiesList = document.getElementById('activitiesList');
    const currentDateElement = document.getElementById('currentDate');
    const totalActivitiesElement = document.getElementById('totalActivities');
    const completedActivitiesElement = document.getElementById('completedActivities');
    const productivityScoreElement = document.getElementById('productivityScore');
    const totalTimeElement = document.getElementById('totalTime');
    const historyModal = document.getElementById('historyModal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const historyContainer = document.getElementById('historyContainer');
    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterPriority = document.getElementById('filterPriority');
    const filterTagsBtn = document.getElementById('filterTagsBtn');
    const tagsFilterModal = document.getElementById('tagsFilterModal');
    const tagsFilterContainer = document.getElementById('tagsFilterContainer');
    const applyTagsFilterBtn = document.getElementById('applyTagsFilterBtn');
    const clearTagsFilterBtn = document.getElementById('clearTagsFilterBtn');
    const tagsContainer = document.getElementById('tagsContainer');
    const dataModal = document.getElementById('dataModal');
    const dataModalTitle = document.getElementById('dataModalTitle');
    const dataTextarea = document.getElementById('dataTextarea');
    const copyDataBtn = document.getElementById('copyDataBtn');
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    const importConfirmBtn = document.getElementById('importConfirmBtn');
    const formatBtns = document.querySelectorAll('.format-btn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const calendarView = document.getElementById('calendarView');
    const pomodoroTimer = document.getElementById('pomodoroTimer');
    const pomodoroStartBtn = document.getElementById('pomodoroStartBtn');
    const pomodoroPauseBtn = document.getElementById('pomodoroPauseBtn');
    const pomodoroResetBtn = document.getElementById('pomodoroResetBtn');
    const pomodoroMode = document.getElementById('pomodoroMode');
    const pomodoroStatus = document.getElementById('pomodoroStatus');
    const pomodoroCount = document.getElementById('pomodoroCount');
    const goalProgressBar = document.getElementById('goalProgressBar');
    const goalProgressText = document.getElementById('goalProgressText');
    const dailyGoalInput = document.getElementById('dailyGoalInput');
    const updateGoalBtn = document.getElementById('updateGoalBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    // Current date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    currentDateElement.textContent = formattedDate;
    
    // State variables
    let activities = JSON.parse(localStorage.getItem(`activities_${currentDate.toDateString()}`)) || [];
    let filteredActivities = [];
    let activeTags = [];
    let pomodoroInterval;
    let pomodoroSecondsLeft = 25 * 60;
    let pomodoroCountValue = 0;
    let isPomodoroRunning = false;
    let currentPomodoroMode = 'work';
    let dailyGoal = parseInt(localStorage.getItem('dailyGoal')) || 5;
    let draggedItem = null;
    
    // Initialize the app
    function init() {
        loadTheme();
        renderActivities();
        updateStats();
        updateGoalDisplay();
        dailyGoalInput.value = dailyGoal;
        
        // Load saved days for history
        if (!localStorage.getItem('savedDays')) {
            localStorage.setItem('savedDays', JSON.stringify([]));
        }
        
        // Set up drag and drop
        setupDragAndDrop();
        
        // Initialize Pomodoro timer
        updatePomodoroDisplay();
    }
    
    // Theme functions
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleIcon(newTheme);
    }
    
    function updateThemeToggleIcon(theme) {
        const icon = theme === 'light' ? 'fa-moon' : 'fa-sun';
        themeToggleBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    }
    
    // Drag and drop setup
    function setupDragAndDrop() {
        activitiesList.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('activity-item')) {
                draggedItem = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
            }
        });
        
        activitiesList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(activitiesList, e.clientY);
            if (afterElement == null) {
                activitiesList.appendChild(draggedItem);
            } else {
                activitiesList.insertBefore(draggedItem, afterElement);
            }
        });
        
        activitiesList.addEventListener('dragend', function(e) {
            if (e.target.classList.contains('activity-item')) {
                e.target.classList.remove('dragging');
                updateActivityOrder();
            }
        });
    }
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.activity-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function updateActivityOrder() {
        const activityElements = activitiesList.querySelectorAll('.activity-item');
        const newOrder = Array.from(activityElements).map(el => {
            return activities.find(a => a.text === el.querySelector('.activity-text').textContent);
        });
        activities = newOrder.filter(a => a !== undefined);
        saveActivities();
    }
    
    // Render activities to the DOM
    function renderActivities(filtered = false) {
        activitiesList.innerHTML = '';
        
        const activitiesToRender = filtered ? filteredActivities : activities;
        
        if (activitiesToRender.length === 0) {
            activitiesList.innerHTML = '<p class="empty-message">No activities found. Try changing your filters or add new activities!</p>';
            return;
        }
        
        activitiesToRender.forEach((activity, index) => {
            const activityElement = document.createElement('div');
            activityElement.className = `activity-item ${activity.completed ? 'completed' : ''}`;
            activityElement.draggable = true;
            
            // Calculate duration
            const duration = calculateDuration(activity.startTime, activity.endTime);
            
            activityElement.innerHTML = `
                <div class="activity-content">
                    <input type="checkbox" class="activity-checkbox" ${activity.completed ? 'checked' : ''} data-index="${index}">
                    <div>
                        <div class="activity-text">${activity.text}</div>
                        ${activity.tags && activity.tags.length > 0 ? `
                            <div class="activity-tags">
                                ${activity.tags.map(tag => `<span class="activity-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <span class="activity-priority priority-${activity.priority}">${activity.priority}</span>
                    <span class="activity-time"><i class="far fa-clock"></i> ${activity.startTime} - ${activity.endTime} (${duration})</span>
                    <span class="activity-category category-${activity.category}">${activity.category}</span>
                </div>
                <div class="activity-actions">
                    <button class="edit-btn" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            activitiesList.appendChild(activityElement);
        });
        
        // Add event listeners to checkboxes, edit and delete buttons
        document.querySelectorAll('.activity-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', toggleComplete);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', editActivity);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', deleteActivity);
        });
        
        updateStats();
    }
    
    // Calculate duration between two times
    function calculateDuration(startTime, endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        
        // Handle overnight activities
        if (totalMinutes < 0) {
            totalMinutes += 24 * 60;
        }
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    // Add a new activity
    function addActivity() {
        const text = activityInput.value.trim();
        const category = categorySelect.value;
        const priority = prioritySelect.value;
        const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        
        if (text === '') {
            alert('Please enter an activity');
            return;
        }
        
        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }
        
        const newActivity = {
            text,
            category,
            priority,
            tags,
            startTime,
            endTime,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        activities.push(newActivity);
        saveActivities();
        clearInputs();
        renderActivities();
        updateStats();
        updateGoalProgress();
    }
    
    // Clear input fields
    function clearInputs() {
        activityInput.value = '';
        tagsInput.value = '';
        startTimeInput.value = '08:00';
        endTimeInput.value = '09:00';
    }
    
    // Toggle activity completion status
    function toggleComplete(e) {
        const index = e.target.dataset.index;
        const activitiesArray = filteredActivities.length > 0 ? filteredActivities : activities;
        const actualIndex = activities.findIndex(a => a.text === activitiesArray[index].text);
        
        if (actualIndex !== -1) {
            activities[actualIndex].completed = !activities[actualIndex].completed;
            saveActivities();
            renderActivities(filteredActivities.length > 0);
            updateStats();
            updateGoalProgress();
        }
    }
    
    // Edit an activity
    function editActivity(e) {
        const index = e.target.dataset.index;
        const activitiesArray = filteredActivities.length > 0 ? filteredActivities : activities;
        const activity = activitiesArray[index];
        const actualIndex = activities.findIndex(a => a.text === activity.text);
        
        if (actualIndex !== -1) {
            activityInput.value = activity.text;
            categorySelect.value = activity.category;
            prioritySelect.value = activity.priority;
            tagsInput.value = activity.tags.join(', ');
            startTimeInput.value = activity.startTime;
            endTimeInput.value = activity.endTime;
            
            // Remove the activity being edited
            activities.splice(actualIndex, 1);
            saveActivities();
            renderActivities(filteredActivities.length > 0);
            updateStats();
            updateGoalProgress();
            
            // Focus the input
            activityInput.focus();
        }
    }
    
    // Delete an activity
    function deleteActivity(e) {
        if (confirm('Are you sure you want to delete this activity?')) {
            const index = e.target.dataset.index;
            const activitiesArray = filteredActivities.length > 0 ? filteredActivities : activities;
            const activityText = activitiesArray[index].text;
            const actualIndex = activities.findIndex(a => a.text === activityText);
            
            if (actualIndex !== -1) {
                activities.splice(actualIndex, 1);
                saveActivities();
                renderActivities(filteredActivities.length > 0);
                updateStats();
                updateGoalProgress();
            }
        }
    }
    
    // Clear all activities
    function clearAllActivities() {
        if (activities.length === 0) {
            alert('There are no activities to clear');
            return;
        }
        
        if (confirm('Are you sure you want to clear all activities?')) {
            activities = [];
            filteredActivities = [];
            saveActivities();
            renderActivities();
            updateStats();
            updateGoalProgress();
            clearActiveTags();
        }
    }
    
    // Save the current day's activities to history
    function saveDay() {
        if (activities.length === 0) {
            alert('There are no activities to save');
            return;
        }
        
        const savedDays = JSON.parse(localStorage.getItem('savedDays'));
        const dateKey = currentDate.toDateString();
        
        // Check if this day is already saved
        const existingDayIndex = savedDays.findIndex(day => day.date === dateKey);
        
        if (existingDayIndex !== -1) {
            // Update existing day
            savedDays[existingDayIndex].activities = [...activities];
        } else {
            // Add new day
            savedDays.push({
                date: dateKey,
                dateFormatted: formattedDate,
                activities: [...activities]
            });
        }
        
        localStorage.setItem('savedDays', JSON.stringify(savedDays));
        alert('Day saved successfully!');
    }
    
    // View history of saved days
    function viewHistory() {
        historyContainer.innerHTML = '';
        const savedDays = JSON.parse(localStorage.getItem('savedDays'));
        
        if (savedDays.length === 0) {
            historyContainer.innerHTML = '<p>No saved days yet. Save your first day to see it here.</p>';
        } else {
            savedDays.reverse().forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'history-day';
                
                let activitiesHTML = '';
                day.activities.forEach(activity => {
                    const duration = calculateDuration(activity.startTime, activity.endTime);
                    
                    activitiesHTML += `
                        <div class="history-activity ${activity.completed ? 'completed' : ''}">
                            <div>
                                <span>${activity.text}</span>
                                ${activity.tags && activity.tags.length > 0 ? `
                                    <div class="activity-tags">
                                        ${activity.tags.map(tag => `<span class="activity-tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <div>
                                <span>${activity.startTime} - ${activity.endTime} (${duration})</span>
                                <span class="activity-category category-${activity.category}">${activity.category}</span>
                                <span class="activity-priority priority-${activity.priority}">${activity.priority}</span>
                            </div>
                        </div>
                    `;
                });
                
                dayElement.innerHTML = `
                    <div class="history-date">${day.dateFormatted}</div>
                    ${activitiesHTML}
                `;
                
                historyContainer.appendChild(dayElement);
            });
        }
        
        historyModal.style.display = 'block';
    }
    
    // Update statistics
    function updateStats() {
        const activitiesToCount = filteredActivities.length > 0 ? filteredActivities : activities;
        const total = activitiesToCount.length;
        const completed = activitiesToCount.filter(activity => activity.completed).length;
        const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Calculate total time
        let totalMinutes = 0;
        activitiesToCount.forEach(activity => {
            const [startHours, startMinutes] = activity.startTime.split(':').map(Number);
            const [endHours, endMinutes] = activity.endTime.split(':').map(Number);
            
            let activityMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
            if (activityMinutes < 0) {
                activityMinutes += 24 * 60;
            }
            
            totalMinutes += activityMinutes;
        });
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        totalActivitiesElement.textContent = total;
        completedActivitiesElement.textContent = completed;
        productivityScoreElement.textContent = `${productivity}%`;
        totalTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    // Update goal progress
    function updateGoalProgress() {
        const completed = activities.filter(activity => activity.completed).length;
        const progress = Math.min((completed / dailyGoal) * 100, 100);
        
        goalProgressBar.style.width = `${progress}%`;
        goalProgressText.textContent = `${completed}/${dailyGoal} activities completed`;
    }
    
    // Update goal display
    function updateGoalDisplay() {
        dailyGoalInput.value = dailyGoal;
        updateGoalProgress();
    }
    
    // Save activities to localStorage
    function saveActivities() {
        localStorage.setItem(`activities_${currentDate.toDateString()}`, JSON.stringify(activities));
    }
    
    // Filter activities
    function filterActivities() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryFilter = filterCategory.value;
        const priorityFilter = filterPriority.value;
        
        filteredActivities = activities.filter(activity => {
            const matchesSearch = activity.text.toLowerCase().includes(searchTerm) || 
                                (activity.tags && activity.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            const matchesCategory = categoryFilter === 'all' || activity.category === categoryFilter;
            const matchesPriority = priorityFilter === 'all' || activity.priority === priorityFilter;
            const matchesTags = activeTags.length === 0 || 
                               (activity.tags && activeTags.every(tag => activity.tags.includes(tag)));
            
            return matchesSearch && matchesCategory && matchesPriority && matchesTags;
        });
        
        renderActivities(true);
        renderActiveTags();
    }
    
    // Show tags filter modal
    function showTagsFilterModal() {
        tagsFilterContainer.innerHTML = '';
        
        // Get all unique tags
        const allTags = new Set();
        activities.forEach(activity => {
            if (activity.tags && activity.tags.length > 0) {
                activity.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        if (allTags.size === 0) {
            tagsFilterContainer.innerHTML = '<p>No tags found in activities.</p>';
        } else {
            Array.from(allTags).sort().forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.className = `tag-filter-item ${activeTags.includes(tag) ? 'selected' : ''}`;
                tagElement.textContent = tag;
                tagElement.dataset.tag = tag;
                tagElement.addEventListener('click', () => {
                    tagElement.classList.toggle('selected');
                });
                tagsFilterContainer.appendChild(tagElement);
            });
        }
        
        tagsFilterModal.style.display = 'block';
    }
    
    // Apply tags filter
    function applyTagsFilter() {
        const selectedTags = Array.from(tagsFilterContainer.querySelectorAll('.tag-filter-item.selected'))
                                .map(el => el.dataset.tag);
        
        activeTags = selectedTags;
        tagsFilterModal.style.display = 'none';
        filterActivities();
    }
    
    // Clear tags filter
    function clearTagsFilter() {
        activeTags = [];
        tagsFilterModal.style.display = 'none';
        filterActivities();
    }
    
    // Clear active tags
    function clearActiveTags() {
        activeTags = [];
        renderActiveTags();
    }
    
    // Render active tags
    function renderActiveTags() {
        tagsContainer.innerHTML = '';
        
        if (activeTags.length > 0) {
            activeTags.forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.className = 'active-tag';
                tagElement.innerHTML = `
                    ${tag}
                    <button data-tag="${tag}">&times;</button>
                `;
                tagsContainer.appendChild(tagElement);
            });
            
            // Add event listeners to remove buttons
            tagsContainer.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tagToRemove = e.target.dataset.tag;
                    activeTags = activeTags.filter(tag => tag !== tagToRemove);
                    filterActivities();
                });
            });
        }
    }
    
    // Export data
    function exportData(format = 'json') {
        dataModalTitle.textContent = 'Export Data';
        importConfirmBtn.style.display = 'none';
        
        const data = {
            date: currentDate.toDateString(),
            activities: activities,
            settings: {
                dailyGoal: dailyGoal,
                theme: document.documentElement.getAttribute('data-theme')
            }
        };
        
        if (format === 'json') {
            dataTextarea.value = JSON.stringify(data, null, 2);
        } else {
            // CSV format
            let csv = 'Text,Category,Priority,Tags,Start Time,End Time,Completed\n';
            data.activities.forEach(activity => {
                csv += `"${activity.text}",${activity.category},${activity.priority},"${activity.tags.join(',')}",${activity.startTime},${activity.endTime},${activity.completed}\n`;
            });
            dataTextarea.value = csv;
        }
        
        dataModal.style.display = 'block';
    }
    
    // Import data
    function importData() {
        dataModalTitle.textContent = 'Import Data';
        importConfirmBtn.style.display = 'block';
        dataTextarea.value = '';
        dataModal.style.display = 'block';
    }
    
    // Confirm import
    function confirmImport() {
        try {
            const data = JSON.parse(dataTextarea.value);
            
            if (data.activities && Array.isArray(data.activities)) {
                if (confirm('Importing data will replace your current activities. Continue?')) {
                    activities = data.activities;
                    if (data.settings) {
                        if (data.settings.dailyGoal) {
                            dailyGoal = data.settings.dailyGoal;
                            dailyGoalInput.value = dailyGoal;
                            localStorage.setItem('dailyGoal', dailyGoal.toString());
                        }
                        if (data.settings.theme) {
                            document.documentElement.setAttribute('data-theme', data.settings.theme);
                            localStorage.setItem('theme', data.settings.theme);
                            updateThemeToggleIcon(data.settings.theme);
                        }
                    }
                    saveActivities();
                    renderActivities();
                    updateStats();
                    updateGoalProgress();
                    dataModal.style.display = 'none';
                    alert('Data imported successfully!');
                }
            } else {
                throw new Error('Invalid data format');
            }
        } catch (e) {
            alert('Error importing data: ' + e.message);
        }
    }
    
    // Copy data to clipboard
    function copyData() {
        dataTextarea.select();
        document.execCommand('copy');
        alert('Data copied to clipboard!');
    }
    
    // Download data
    function downloadData() {
        const format = document.querySelector('.format-btn.active').dataset.format;
        const blob = new Blob([dataTextarea.value], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activities-${currentDate.toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Toggle view between list and calendar
    function toggleView(view) {
        if (view === 'list') {
            listViewBtn.classList.add('active');
            calendarViewBtn.classList.remove('active');
            activitiesList.style.display = 'block';
            calendarView.style.display = 'none';
        } else {
            listViewBtn.classList.remove('active');
            calendarViewBtn.classList.add('active');
            activitiesList.style.display = 'none';
            calendarView.style.display = 'block';
            renderCalendar();
        }
    }
    
    // Render calendar view
    function renderCalendar() {
        calendarView.innerHTML = '';
        
        // Get current month and year
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Get first day of month and total days in month
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Create calendar header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const calendarHeader = document.createElement('div');
        calendarHeader.className = 'calendar-header';
        calendarHeader.innerHTML = `
            <h3>${monthNames[currentMonth]} ${currentYear}</h3>
        `;
        calendarView.appendChild(calendarHeader);
        
        // Create calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        
        // Add day names
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day-header';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            // Check if this is today
            if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                dayElement.classList.add('today');
            }
            
            // Add day number
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            dayElement.appendChild(dayHeader);
            
            // Get activities for this day
            const dateKey = new Date(currentYear, currentMonth, day).toDateString();
            const savedDays = JSON.parse(localStorage.getItem('savedDays')) || [];
            const dayActivities = savedDays.find(d => d.date === dateKey)?.activities || [];
            
            // Add activities to day
            dayActivities.slice(0, 3).forEach(activity => { // Show max 3 activities per day
                const activityElement = document.createElement('div');
                activityElement.className = 'calendar-activity';
                activityElement.textContent = activity.text;
                activityElement.title = `${activity.text} (${activity.startTime}-${activity.endTime})`;
                dayElement.appendChild(activityElement);
            });
            
            // Add more indicator if there are more activities
            if (dayActivities.length > 3) {
                const moreElement = document.createElement('div');
                moreElement.className = 'calendar-activity';
                moreElement.textContent = `+${dayActivities.length - 3} more`;
                dayElement.appendChild(moreElement);
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        calendarView.appendChild(calendarGrid);
    }
    
    // Pomodoro timer functions
    function startPomodoro() {
        if (isPomodoroRunning) return;
        
        isPomodoroRunning = true;
        currentPomodoroMode = pomodoroMode.value;
        
        // Set time based on mode
        switch (currentPomodoroMode) {
            case 'work':
                pomodoroSecondsLeft = 25 * 60;
                pomodoroStatus.textContent = 'Working...';
                break;
            case 'shortBreak':
                pomodoroSecondsLeft = 5 * 60;
                pomodoroStatus.textContent = 'Short break';
                break;
            case 'longBreak':
                pomodoroSecondsLeft = 15 * 60;
                pomodoroStatus.textContent = 'Long break';
                break;
        }
        
        updatePomodoroDisplay();
        
        pomodoroInterval = setInterval(() => {
            pomodoroSecondsLeft--;
            updatePomodoroDisplay();
            
            if (pomodoroSecondsLeft <= 0) {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                
                // Play sound
                const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                audio.play();
                
                // Update status and count
                if (currentPomodoroMode === 'work') {
                    pomodoroCountValue++;
                    pomodoroCount.textContent = `Pomodoros: ${pomodoroCountValue}`;
                    pomodoroStatus.textContent = 'Work session complete!';
                } else {
                    pomodoroStatus.textContent = 'Break time over!';
                }
                
                // Auto-start next session
                if (currentPomodoroMode === 'work') {
                    if (pomodoroCountValue % 4 === 0) {
                        pomodoroMode.value = 'longBreak';
                    } else {
                        pomodoroMode.value = 'shortBreak';
                    }
                } else {
                    pomodoroMode.value = 'work';
                }
            }
        }, 1000);
    }
    
    function pausePomodoro() {
        if (!isPomodoroRunning) return;
        
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroStatus.textContent = 'Paused';
    }
    
    function resetPomodoro() {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        currentPomodoroMode = pomodoroMode.value;
        
        switch (currentPomodoroMode) {
            case 'work':
                pomodoroSecondsLeft = 25 * 60;
                pomodoroStatus.textContent = 'Ready to work';
                break;
            case 'shortBreak':
                pomodoroSecondsLeft = 5 * 60;
                pomodoroStatus.textContent = 'Short break';
                break;
            case 'longBreak':
                pomodoroSecondsLeft = 15 * 60;
                pomodoroStatus.textContent = 'Long break';
                break;
        }
        
        updatePomodoroDisplay();
    }
    
    function updatePomodoroDisplay() {
        const minutes = Math.floor(pomodoroSecondsLeft / 60);
        const seconds = pomodoroSecondsLeft % 60;
        pomodoroTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update daily goal
    function updateDailyGoal() {
        const newGoal = parseInt(dailyGoalInput.value);
        
        if (newGoal >= 1 && newGoal <= 20) {
            dailyGoal = newGoal;
            localStorage.setItem('dailyGoal', dailyGoal.toString());
            updateGoalProgress();
            alert('Daily goal updated!');
        } else {
            alert('Please enter a goal between 1 and 20');
            dailyGoalInput.value = dailyGoal;
        }
    }
    
    // Event Listeners
    addBtn.addEventListener('click', addActivity);
    activityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addActivity();
        }
    });
    
    clearAllBtn.addEventListener('click', clearAllActivities);
    saveDayBtn.addEventListener('click', saveDay);
    viewHistoryBtn.addEventListener('click', viewHistory);
    exportDataBtn.addEventListener('click', () => exportData('json'));
    importDataBtn.addEventListener('click', importData);
    
    searchInput.addEventListener('input', filterActivities);
    filterCategory.addEventListener('change', filterActivities);
    filterPriority.addEventListener('change', filterActivities);
    filterTagsBtn.addEventListener('click', showTagsFilterModal);
    applyTagsFilterBtn.addEventListener('click', applyTagsFilter);
    clearTagsFilterBtn.addEventListener('click', clearTagsFilter);
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    formatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            formatBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const format = this.dataset.format;
            exportData(format);
        });
    });
    
    copyDataBtn.addEventListener('click', copyData);
    downloadDataBtn.addEventListener('click', downloadData);
    importConfirmBtn.addEventListener('click', confirmImport);
    
    listViewBtn.addEventListener('click', () => toggleView('list'));
    calendarViewBtn.addEventListener('click', () => toggleView('calendar'));
    
    pomodoroStartBtn.addEventListener('click', startPomodoro);
    pomodoroPauseBtn.addEventListener('click', pausePomodoro);
    pomodoroResetBtn.addEventListener('click', resetPomodoro);
    pomodoroMode.addEventListener('change', resetPomodoro);
    
    updateGoalBtn.addEventListener('click', updateDailyGoal);
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Initialize the app
    init();
});
