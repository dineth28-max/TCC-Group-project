# Cloud-Based Student Management and Attendance System (CSMAS)

## Technologies Used

This project is developed using a combination of modern frontend, backend, database, artificial intelligence, containerization, and DevOps technologies.

### Frontend

* **React.js** – Used to build the web-based user interface.
* **Vite** – Used as the frontend development and build tool.
* **Tailwind CSS** – Used for styling and responsive UI design.
* **React Router** – Used for navigation between different pages.
* **Axios** – Used to communicate with backend REST APIs.
* **TanStack React Query** – Used for managing API requests and server data.
* **Recharts** – Used to display charts and dashboard statistics.
* **Lucide React** – Used for interface icons.
* **HTML5 QR Code** – Used for scanning QR codes for attendance.
* **QRCode React** – Used to generate QR codes.

### Backend

* **C#**
* **ASP.NET Core**
* **.NET 8**
* **REST API**
* **Entity Framework Core**
* **Pomelo Entity Framework Core for MySQL**

The backend manages application logic, users, students, attendance, authentication, database communication, reports, and other system functions.

### Authentication and Security

* **JWT (JSON Web Token)** – Used for authentication and authorization.
* **ASP.NET Core Identity** – Used for user and identity management.
* **HTTPS / SSL** – Supported through the Nginx configuration.

### Database

* **MySQL 8.0** – Main relational database used to store application data.
* **Entity Framework Core** – Used as the ORM between the ASP.NET Core backend and MySQL.
* **Adminer** – Used as a web-based database management interface.

### Artificial Intelligence / Machine Learning

The project contains an AI service for identifying students who may be at risk based on academic and attendance information.

Technologies used include:

* **Python**
* **Flask**
* **Scikit-learn**
* **Pandas**
* **NumPy**
* **Joblib**
* **Random Forest Classifier**
* **StandardScaler**

The AI model considers information such as:

* Attendance rate
* Average grade
* Assignments submitted
* Failed modules
* Financial issues
* Student engagement
* Semester information

The trained Random Forest model can be used to classify students into different dropout-risk levels.

### Reporting and Data Processing

The backend also uses:

* **QuestPDF** – PDF report generation.
* **ClosedXML** – Excel file generation and processing.
* **CsvHelper** – CSV file processing.

### Email and Background Processing

* **MailKit** – Used for email-related functionality.
* **Hangfire** – Used for background and scheduled tasks.

### Payment Integration

* **Stripe.NET** – Used for payment-related functionality.

### Containerization

* **Docker** – Used to containerize the different application services.
* **Docker Compose** – Used to run and manage multiple containers.

The project contains containers for:

* Frontend
* Backend
* MySQL Database
* Nginx
* Adminer
* AI Service

### Web Server and Reverse Proxy

* **Nginx** – Used as a reverse proxy and web server.
* **HTTPS / SSL certificates** – Supported for secure communication.

### CI/CD and Version Control

* **Git**
* **GitHub**
* **GitHub Actions**
* **Docker Hub**

GitHub Actions workflows are included for building Docker images, pushing images to Docker Hub, and deploying updated application containers.

## Technology Stack Summary

| Component          | Technologies                               |
| ------------------ | ------------------------------------------ |
| Frontend           | React, Vite, Tailwind CSS, Axios           |
| Backend            | C#, ASP.NET Core, .NET 8                   |
| API                | REST API                                   |
| Database           | MySQL 8.0                                  |
| ORM                | Entity Framework Core                      |
| Authentication     | JWT, ASP.NET Core Identity                 |
| AI / ML            | Python, Flask, Scikit-learn, Random Forest |
| QR Attendance      | HTML5 QR Code, QRCode React                |
| Charts             | Recharts                                   |
| Reports            | QuestPDF, ClosedXML, CsvHelper             |
| Email              | MailKit                                    |
| Background Jobs    | Hangfire                                   |
| Payment            | Stripe                                     |
| Containerization   | Docker, Docker Compose                     |
| Web Server         | Nginx                                      |
| CI/CD              | GitHub Actions                             |
| Container Registry | Docker Hub                                 |
| Version Control    | Git & GitHub                               |

## Overall Architecture

```text
                    User
                      |
                      v
                 React Frontend
                      |
                      v
                    Nginx
                      |
                      v
              ASP.NET Core API
                 /         \
                /           \
               v             v
           MySQL          AI Service
                          Python/Flask
                               |
                               v
                    Random Forest Model
```

The combination of these technologies provides a scalable architecture for managing students, attendance, academic information, authentication, reporting, and AI-based student risk analysis.
