// server.js

// Import necessary modules
const mysql = require('mysql2');
const inquirer = require('inquirer');

// Set up your database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Your MAMP MySQL username
    password: 'root', // Your MAMP MySQL password
    database: 'employee_tracker',
    port: 8889 // The port MAMP MySQL is running on
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Error connecting: ' + err.stack);
        return;
    }
    console.log('Connected as id ' + db.threadId);
    runApp(); // Start the application after connecting to the database
});

// runApp function starts your application after connecting to the database
function runApp() {
    inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            'View All Employees',
            'View All Departments',
            'View All Roles',
            'Add an Employee',
            'Add a Department',
            'Add a Role',
            'Update Employee Role',
            'Exit'
        ]
    }).then(answer => {
        switch (answer.action) {
            case 'View All Employees':
                viewAllEmployees();
                break;
            case 'View All Departments':
                viewAllDepartments();
                break;
            case 'View All Roles':
                viewAllRoles();
                break;
            case 'Add an Employee':
                addEmployee();
                break;
            case 'Add a Department':
                addDepartment();
                break;
            case 'Add a Role':
                addRole();
                break;
            case 'Update Employee Role':
                updateEmployeeRole();
                break;
            case 'Exit':
                db.end();
                console.log('Goodbye!');
                break;
            default:
                console.log(`Invalid action: ${answer.action}`);
                runApp();
                break;
        }
    });
}

// Define functions for each action
// ... (include all other function implementations here)
// Function implementations

function viewAllDepartments() {
    db.promise().query('SELECT id, name FROM department')
        .then(([rows]) => {
            console.table(rows);
        })
        .catch(console.log)
        .then(() => runApp());
}

function viewAllRoles() {
    db.promise().query('SELECT role.id, role.title, department.name AS department, role.salary FROM role JOIN department ON role.department_id = department.id')
        .then(([rows]) => {
            console.table(rows);
        })
        .catch(console.log)
        .then(() => runApp());
}

function viewAllEmployees() {
    db.promise().query('SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, " ", manager.last_name) AS manager FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id LEFT JOIN employee AS manager ON employee.manager_id = manager.id')
        .then(([rows]) => {
            console.table(rows);
        })
        .catch(console.log)
        .then(() => runApp());
}

function addDepartment() {
    inquirer.prompt({
        name: 'departmentName',
        type: 'input',
        message: 'What is the name of the department?'
    }).then(answer => {
        db.promise().query('INSERT INTO department (name) VALUES (?)', answer.departmentName)
            .then(() => {
                console.log(`Added ${answer.departmentName} to the database.`);
            })
            .catch(console.log)
            .then(() => runApp());
    });
}

// ... (implement addEmployee, addRole, and updateEmployeeRole functions similarly)
// Function to add an employee
function addEmployee() {
    // First, get the list of roles to allow the user to select one
    db.promise().query('SELECT id, title FROM role')
        .then(([roles]) => {
            const roleChoices = roles.map(role => ({ name: role.title, value: role.id }));

            // Then, get the list of employees to select a manager
            return db.promise().query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee')
                .then(([employees]) => {
                    const managerChoices = employees.map(employee => ({ name: employee.name, value: employee.id }));
                    managerChoices.unshift({ name: 'None', value: null });

                    // Prompt the user for the new employee's information
                    return inquirer.prompt([
                        {
                            name: 'firstName',
                            type: 'input',
                            message: "What is the employee's first name?"
                        },
                        {
                            name: 'lastName',
                            type: 'input',
                            message: "What is the employee's last name?"
                        },
                        {
                            name: 'roleId',
                            type: 'list',
                            message: "What is the employee's role?",
                            choices: roleChoices
                        },
                        {
                            name: 'managerId',
                            type: 'list',
                            message: "Who is the employee's manager?",
                            choices: managerChoices
                        }
                    ]);
                });
        })
        .then(answers => {
            // Insert the new employee into the database
            return db.promise().query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)', 
                [answers.firstName, answers.lastName, answers.roleId, answers.managerId]);
        })
        .then(() => {
            console.log('Added new employee to the database.');
        })
        .catch(console.log)
        .then(() => runApp());
}

// Function to add a role
function addRole() {
    // Get the list of departments to allow the user to select one
    db.promise().query('SELECT id, name FROM department')
        .then(([departments]) => {
            const departmentChoices = departments.map(dept => ({ name: dept.name, value: dept.id }));

            // Prompt the user for the new role's information
            return inquirer.prompt([
                {
                    name: 'title',
                    type: 'input',
                    message: 'What is the title of the new role?'
                },
                {
                    name: 'salary',
                    type: 'input',
                    message: 'What is the salary for the new role?',
                    validate: input => {
                        if (isNaN(input)) {
                            return 'Please enter a valid number for the salary.';
                        }
                        return true;
                    }
                },
                {
                    name: 'departmentId',
                    type: 'list',
                    message: 'Which department does this role belong to?',
                    choices: departmentChoices
                }
            ]);
        })
        .then(answers => {
            // Insert the new role into the database
            return db.promise().query('INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)', 
                [answers.title, answers.salary, answers.departmentId]);
        })
        .then(() => {
            console.log('Added new role to the database.');
        })
        .catch(console.log)
        .then(() => runApp());
}

// Function to update an employee role
function updateEmployeeRole() {
    // First, get the list of employees
    db.promise().query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee')
        .then(([employees]) => {
            const employeeChoices = employees.map(employee => ({ name: employee.name, value: employee.id }));

            // Then, get the list of roles
            return db.promise().query('SELECT id, title FROM role')
                .then(([roles]) => {
                    const roleChoices = roles.map(role => ({ name: role.title, value: role.id }));

                    // Prompt the user to select an employee and a new role
                    return inquirer.prompt([
                        {
                            name: 'employeeId',
                            type: 'list',
                            message: "Which employee's role do you want to update?",
                            choices: employeeChoices
                        },
                        {
                            name: 'roleId',
                            type: 'list',
                            message: 'Which new role do you want to assign to the employee?',
                            choices: roleChoices
                        }
                    ]);
                });
        })
        .then(answers => {
            // Update the employee's role in the database
            return db.promise().query('UPDATE employee SET role_id = ? WHERE id = ?', [answers.roleId, answers.employeeId]);
        })
        .then(() => {
            console.log("Employee's role updated successfully.");
        })
        .catch(console.log)
        .then(() => runApp());
}

// Make sure to replace db.query with db.promise().query in your existing functions for consistent use of Promises.
