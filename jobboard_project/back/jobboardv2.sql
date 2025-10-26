-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: jobboard
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.24.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ad_skills`
--

DROP TABLE IF EXISTS `ad_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_skills` (
  `ad_id` int NOT NULL,
  `skill_id` int NOT NULL,
  PRIMARY KEY (`ad_id`,`skill_id`),
  KEY `idx_ad_skills_skill_id` (`skill_id`),
  CONSTRAINT `fk_ad_skills_ad` FOREIGN KEY (`ad_id`) REFERENCES `advertisements` (`ad_id`),
  CONSTRAINT `fk_ad_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_skills`
--

LOCK TABLES `ad_skills` WRITE;
/*!40000 ALTER TABLE `ad_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advertisements`
--

DROP TABLE IF EXISTS `advertisements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advertisements` (
  `ad_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `salary_min` decimal(10,2) DEFAULT NULL,
  `salary_max` decimal(10,2) DEFAULT NULL,
  `contract_type` enum('CDI','CDD','Stage','Freelance','Alternance') DEFAULT NULL,
  `date_posted` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_expiry` date DEFAULT NULL,
  PRIMARY KEY (`ad_id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `fk_ads_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advertisements`
--

LOCK TABLES `advertisements` WRITE;
/*!40000 ALTER TABLE `advertisements` DISABLE KEYS */;
INSERT INTO `advertisements` VALUES (11,2,'Backend Engineer','At DataInsight, you will architect and implement RESTful APIs and data pipelines using FastAPI and PostgreSQL. You’ll ensure reliability and performance of large-scale data systems.','Lyon',38000.00,52000.00,'CDI','2025-10-13 22:28:44','2025-11-30'),(12,3,'Marketing Assistant','Marketify is looking for a creative assistant to manage social media campaigns, coordinate events, and monitor analytics dashboards. You’ll support the marketing manager in brand strategy.','Paris',28000.00,35000.00,'CDD','2025-10-13 22:28:44','2025-09-15'),(13,4,'UX/UI Designer','At DesignSpark, you will design modern interfaces for mobile and web applications, conduct user research, and build interactive prototypes. Figma and Adobe XD mastery required.','Rouen / Remote',32000.00,42000.00,'CDD','2025-10-13 22:28:44','2025-10-31'),(14,5,'Full Stack Developer','SoftBridge needs a versatile full-stack engineer proficient in Python, FastAPI, and Vue.js. You will maintain internal tools, integrate APIs, and ensure code quality through CI/CD.','Lille',40000.00,55000.00,'CDI','2025-10-13 22:28:44','2025-12-15'),(15,6,'IT Support Technician','HelpMeIT seeks an IT technician to install, configure, and troubleshoot hardware and software for clients. Customer-facing position with flexible working hours and on-site missions.','Toulouse',27000.00,36000.00,'CDI','2025-10-13 22:28:44','2025-08-31'),(16,9,'ingénieur','test','Paris',1235.00,689451.00,'Freelance','2025-10-19 19:04:56','2026-07-16');
/*!40000 ALTER TABLE `advertisements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `ad_id` int NOT NULL,
  `applicant_id` int NOT NULL,
  `recruiter_id` int DEFAULT NULL,
  `application_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('Sent','In review','Interview','Rejected','Hired') DEFAULT 'Sent',
  `message` text,
  PRIMARY KEY (`application_id`),
  KEY `ad_id` (`ad_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `recruiter_id` (`recruiter_id`),
  CONSTRAINT `fk_app_ad` FOREIGN KEY (`ad_id`) REFERENCES `advertisements` (`ad_id`),
  CONSTRAINT `fk_app_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `people` (`person_id`),
  CONSTRAINT `fk_app_recruiter` FOREIGN KEY (`recruiter_id`) REFERENCES `people` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_profiles`
--

DROP TABLE IF EXISTS `candidate_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `person_id` int NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `experience` text,
  `education` varchar(100) DEFAULT NULL,
  `years_experience` int DEFAULT NULL,
  `skills` text,
  `about` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  KEY `person_id` (`person_id`),
  CONSTRAINT `candidate_profiles_ibfk_1` FOREIGN KEY (`person_id`) REFERENCES `people` (`person_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_profiles`
--

LOCK TABLES `candidate_profiles` WRITE;
/*!40000 ALTER TABLE `candidate_profiles` DISABLE KEYS */;
INSERT INTO `candidate_profiles` VALUES (4,7,'Paris',NULL,NULL,NULL,NULL,'','2025-10-19 18:28:32'),(5,11,'Paris','','Bachelor\'s Degree',3,'Python','','2025-10-19 20:19:14');
/*!40000 ALTER TABLE `candidate_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `company_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `size` enum('Startup','PME','Grande entreprise') DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (2,'TechNova','Technology','Startup','https://www.technova.io','contact@technova.io','+33 1 40 00 00 01','12 rue Oberkampf, Paris','2025-10-13 22:28:39'),(3,'DataInsight','Data Analytics','PME','https://www.datainsight.fr','jobs@datainsight.fr','+33 4 72 00 00 02','22 avenue Foch, Lyon','2025-10-13 22:28:39'),(4,'Marketify','Marketing','PME','https://www.marketify.fr','hr@marketify.fr','+33 1 55 00 00 03','8 rue Rivoli, Paris','2025-10-13 22:28:39'),(5,'DesignSpark','Design','Startup','https://www.designspark.io','hello@designspark.io','+33 2 35 00 00 04','5 place du Vieux Marché, Rouen','2025-10-13 22:28:39'),(6,'SoftBridge','Software Services','Grande entreprise','https://www.softbridge.com','recruit@softbridge.com','+33 3 44 00 00 05','45 boulevard Wilson, Lille','2025-10-13 22:28:39'),(7,'HelpMeIT','IT Support','PME','https://www.helpmeit.fr','support@helpmeit.fr','+33 5 61 00 00 06','33 allée Jean Jaurès, Toulouse','2025-10-13 22:28:39'),(8,'Reminder','tch','Startup','','walid@gmail.com','0612345678','','2025-10-19 13:41:19'),(9,'Technop','Tech','PME','','company@gmail.com','0613248973','123 rue faubourg saint honoré','2025-10-19 18:49:26');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `people`
--

DROP TABLE IF EXISTS `people`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `people` (
  `person_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('Recruiter','Applicant','Admin') DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`person_id`),
  UNIQUE KEY `email` (`email`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `fk_people_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `people`
--

LOCK TABLES `people` WRITE;
/*!40000 ALTER TABLE `people` DISABLE KEYS */;
INSERT INTO `people` VALUES (7,NULL,'Fred','test3','test3@gmail.com','061235498','Applicant','$2b$12$H74UdHIE3Bzk3M1SltbsOuVxYarmX2zH2Z6D.vHwEkdM5t6wZsmDO','2025-10-19 18:28:32'),(8,9,'company','test','company@gmail.com','066123459','Recruiter','$2b$12$HDeIwghmQ4jkFtFIGYCx7eGw9GX8Q0c0gW/o2brbtE9Hi6EN5eniS','2025-10-19 18:49:26'),(11,NULL,'po','la','admin@gmail.com','0612345678','Admin','$2b$12$nbGdPvZ5o4wtm4xMQjed8eJiZZhKCi4g2bMDyNnhsRVlN3Komc7Ym','2025-10-19 20:19:14'),(12,NULL,'Admin','User','admin2@gmail.com',NULL,'Admin','$2b$12$drOHlv39CFs1rShX43WmmOTbUEsdZVhbjwnDBtRKxGFWJ1hp9wm2y','2025-10-19 20:45:17');
/*!40000 ALTER TABLE `people` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `people_roles`
--

DROP TABLE IF EXISTS `people_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `people_roles` (
  `person_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`person_id`,`role_id`),
  KEY `idx_people_roles_person` (`person_id`),
  KEY `idx_people_roles_role` (`role_id`),
  CONSTRAINT `fk_people_roles_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`person_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_people_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `people_roles`
--

LOCK TABLES `people_roles` WRITE;
/*!40000 ALTER TABLE `people_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `people_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `people_skills`
--

DROP TABLE IF EXISTS `people_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `people_skills` (
  `person_id` int NOT NULL,
  `skill_id` int NOT NULL,
  PRIMARY KEY (`person_id`,`skill_id`),
  KEY `idx_people_skills_skill_id` (`skill_id`),
  CONSTRAINT `fk_people_skills_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`person_id`),
  CONSTRAINT `fk_people_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `people_skills`
--

LOCK TABLES `people_skills` WRITE;
/*!40000 ALTER TABLE `people_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `people_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_permissions_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (4,'applications:apply'),(3,'jobs:manage'),(1,'users:create_admin'),(2,'users:create_user');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(1,2),(1,3),(2,3),(1,4),(3,4);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin'),(3,'candidat'),(2,'recruteur');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skills`
--

LOCK TABLES `skills` WRITE;
/*!40000 ALTER TABLE `skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-19 22:48:28
