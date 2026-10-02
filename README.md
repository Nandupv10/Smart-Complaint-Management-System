# Smart Complaint Management System

## 1. Project Overview

The Smart Complaint Management System (SCMS) is a centralized web-based system for submitting, managing, tracking, and resolving complaints.

The system provides separate functionality for users and administrators. Users can register, submit complaints, track complaint status, and provide feedback after resolution. Administrators can view, categorize, assign, update, and resolve complaints.

The project is developed as a Software Engineering Mini-Project for applying software engineering practices including requirements engineering, system modelling, architectural design, testing, and project management.

---

## 2. Problem Statement

Traditional complaint handling processes are often manual, fragmented, and difficult to track. Users may not have a clear way to monitor the progress of a complaint, while administrators may face difficulties in organizing, assigning, and resolving complaints efficiently.

The Smart Complaint Management System provides a centralized platform where complaints can be submitted and tracked throughout their lifecycle. It also provides administrators with tools to categorize complaints, assign them to the appropriate department or authority, update their status, and maintain records of complaint activities.

---

## 3. Objectives

The main objectives of the system are:

- Provide a centralized platform for complaint submission and management.
- Allow users to track the status of submitted complaints.
- Generate a unique identifier for each complaint.
- Allow administrators to categorize and assign complaints.
- Support complaint status updates and resolution.
- Provide feedback and rating functionality after resolution.
- Provide authentication and authorization for controlled system access.
- Maintain audit logs of important system and complaint activities.

---

## 4. System Features

### User Features

- User registration and login
- Complaint submission
- Unique complaint ID generation
- Complaint status tracking
- Viewing complaint information
- Providing feedback and rating after resolution

### Administrator Features

- Administrator login
- View submitted complaints
- Categorize complaints
- Assign complaints to the relevant department or authority
- Update complaint status
- Resolve complaints
- View feedback and reports

### Security and Accountability

- Authentication and authorization
- Role-based access control
- Audit logging of important user and complaint activities

---

## 5. System Workflow

The general complaint workflow is:

1. User registers or logs into the system.
2. User submits a complaint.
3. The system generates a unique complaint ID.
4. The complaint is stored and made available for administrative processing.
5. Administrator reviews and categorizes the complaint.
6. The complaint is assigned to the relevant department or authority.
7. The complaint status is updated as work progresses.
8. The complaint is marked as resolved after completion.
9. The user can provide feedback and a rating.
10. Relevant actions are maintained in the audit log.

---

## 6. System Architecture

The system follows a layered architecture consisting of:

### Presentation Layer

Provides the interfaces through which users and administrators interact with the system.

Components include:

- User Web Interface
- Administrator Web Interface

### Application / Business Layer

Contains the main system services and business logic.

Components include:

- Authentication and Authorization
- Complaint Management
- Complaint Categorization and Assignment
- Status Tracking and Resolution
- Feedback and Rating
- Audit Logging

### Data Layer

Responsible for storing and retrieving system information.

The main data categories include:

- User Data
- Complaint Data
- Feedback Data
- Audit Log Data

The architecture provides separation of concerns between the user interface, application logic, and data storage.

---

## 7. UML and System Models

The repository contains the following system modelling and design documents:

- Actor Identification
- Use Case Model
- UML Use Case Diagram
- Architecture Diagram
- Component Diagram
- Sequence Diagram
- Other design documents required for the project

Refer to the `Architecture` and `Design` folders for the corresponding diagrams.

---

## 8. Requirements Engineering

The requirements documentation contains:

- Problem Statement Analysis
- Software Requirements Specification (SRS)
- Functional Requirements
- Non-Functional Requirements
- Requirements Validation
- Requirements Traceability Matrix (RTM)

The requirements documents are maintained in the `RE` folder.

---

## 9. Testing

Testing activities are documented as part of the mini-project.

The testing documentation includes:

- Test Plan
- Test Cases
- Functional Testing
- Test execution results
- Bug identification
- Bug fixing and retesting

The relevant documents and screenshots are maintained in the `Test_Planning` and `Testing` folders.

---

## 10. Project Management

Project development and task management are documented using GitHub and Jira.

The project management documentation includes:

- Project creation screenshots
- GitHub repository activity
- Jira project configuration
- Scrum / Sprint activities
- Task and issue tracking
- Relevant screenshots

These materials are maintained in the project management folder.

---

## 11. GitHub Copilot / AI-Assisted Development

The project includes documentation of the use of GitHub Copilot or other approved AI-assisted development tools where applicable.

The documentation contains:

- Screenshots of AI-assisted development
- Relevant repository/code references
- Description of the development task for which the tool was used

The corresponding evidence is maintained in the `GitHub_Copilot` folder.

---

## 12. Software Testing Tool Practice

The repository contains documentation related to software testing tool practice.

The process includes:

1. Identifying a software defect or required modification.
2. Using an AI-assisted or vibe-coding approach to investigate the issue.
3. Applying the required fix or patch.
4. Retesting the application.
5. Recording the result.

The relevant repository links, screenshots, and testing evidence are maintained in the `Software_Testing` folder.

---

## 13. Deployment and Environment Setup

Deployment documentation contains the steps required to configure and run the project.

This section includes:

- Development environment requirements
- Software dependencies
- Configuration steps
- Environment variables, where applicable
- Application execution steps
- Deployment configuration
- Deployment screenshots or references

The detailed deployment documentation is maintained in the `Deployment` folder.

---

## 14. Repository Structure

The repository is organized according to the Software Engineering Mini-Project submission requirements.

```text
Smart-Complaint-Management-System/
│
├── README.md
│
├── 01_SRS_WorkBreakdown/
│   ├── SRS
│   └── Work Breakdown
│
├── 02_Test_Planning/
│   ├── Test Plan
│   └── Test Cases
│
├── 03_RE/
│   ├── Functional Requirements
│   ├── Non-Functional Requirements
│   └── Requirements Traceability Matrix
│
├── 04_Architecture_Design/
│   ├── Architecture Diagram
│   ├── Architectural Pattern
│   ├── Component Diagram
│   ├── Sequence Diagram
│   ├── Use Case Diagram
│   └── API / Design Documentation
│
├── 05_Project_Management/
│   ├── GitHub Screenshots
│   └── Jira Scrum / Sprint Screenshots
│
├── 06_GitHub_Copilot/
│   ├── Screenshots
│   └── Repository / Code References
│
├── 07_Software_Testing/
│   ├── Bug Details
│   ├── Fix / Patch
│   ├── Retesting
│   └── Evidence
│
├── 08_Deployment/
│   ├── Environment Setup
│   ├── Installation Steps
│   └── Deployment Details
│
└── 09_Demo/
    ├── Demo Video
    └── Output Screenshots
