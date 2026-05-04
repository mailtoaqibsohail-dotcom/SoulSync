/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: iqraacad_Mari
-- ------------------------------------------------------
-- Server version	10.11.14-MariaDB-cll-lve

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(10) unsigned NOT NULL,
  `action` varchar(100) NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `user_id` int(10) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id` (`entity_type`,`entity_id`),
  KEY `audit_logs_user_id` (`user_id`),
  KEY `audit_logs_action` (`action`),
  KEY `audit_logs_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES
(1,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','curl/8.7.1','2026-04-27 10:53:52'),
(2,'document',1,'created',NULL,'{\"serial_number\":\"PFE-ENG-2026-0001\",\"status\":\"draft\",\"file_path\":\"2026/04/PFE/PFE-ENG-2026-0001_v1.pdf\"}',1,'::ffff:127.0.0.1',NULL,'2026-04-27 10:53:54'),
(3,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','curl/8.7.1','2026-04-27 10:54:03'),
(4,'document',2,'created',NULL,'{\"serial_number\":\"PFE-ENG-2026-0002\",\"status\":\"draft\",\"file_path\":\"2026/04/PFE/PFE-ENG-2026-0002_v1.pdf\"}',1,'::ffff:127.0.0.1',NULL,'2026-04-27 10:54:04'),
(5,'document',3,'created',NULL,'{\"serial_number\":\"PFE-ENG-2026-0003\",\"status\":\"draft\",\"file_path\":\"2026/04/PFE/PFE-ENG-2026-0003_v1.pdf\"}',1,'::ffff:127.0.0.1',NULL,'2026-04-27 10:54:04'),
(6,'document',4,'created',NULL,'{\"serial_number\":\"PFE-ENG-2026-0004\",\"status\":\"draft\",\"file_path\":\"2026/04/PFE/PFE-ENG-2026-0004_v1.pdf\"}',1,'::ffff:127.0.0.1',NULL,'2026-04-27 10:54:05'),
(7,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','curl/8.7.1','2026-04-27 11:06:04'),
(8,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:14:50'),
(9,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:15:09'),
(10,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:15:31'),
(11,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:15:43'),
(12,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:17:10'),
(13,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:17:14'),
(14,'user',1,'login',NULL,NULL,1,'::ffff:127.0.0.1','curl/8.7.1','2026-04-27 11:17:33'),
(15,'user',1,'login',NULL,NULL,1,'154.192.137.72','curl/8.7.1','2026-04-27 11:27:03'),
(16,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-27 11:28:52'),
(17,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-27 11:28:55'),
(18,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-27 11:28:57'),
(19,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-27 11:29:10'),
(20,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-27 11:29:13'),
(21,'document',5,'created',NULL,'{\"serial_number\":\"PFE-ENG-2026-0005\",\"status\":\"draft\",\"file_path\":\"2026/04/PFE/PFE-ENG-2026-0005_v1.pdf\"}',1,'154.192.137.72',NULL,'2026-04-27 11:42:54'),
(22,'document',5,'attachment_uploaded',NULL,'{\"name\":\"Bringing Warmth to the Cold kf.docx\",\"size\":17430}',1,'154.192.137.72',NULL,'2026-04-27 11:42:54'),
(23,'client',1,'created',NULL,'{\"is_active\":true,\"id\":1,\"code\":\"CLIENT\",\"company_name\":\"client company\",\"contact_email\":\"client@company.com\",\"updatedAt\":\"2026-04-27T11:44:05.821Z\",\"createdAt\":\"2026-04-27T11:44:05.821Z\"}',1,'154.192.137.72',NULL,'2026-04-27 11:44:05'),
(24,'project',1,'created',NULL,'{\"id\":1,\"code\":\"PROJECT 2\",\"name\":\"test 1\",\"client_id\":1,\"status\":\"active\",\"updatedAt\":\"2026-04-27T11:44:18.250Z\",\"createdAt\":\"2026-04-27T11:44:18.250Z\"}',1,'154.192.137.72',NULL,'2026-04-27 11:44:18'),
(25,'document',5,'status_changed','{\"status\":\"draft\"}','{\"status\":\"under_review\"}',1,'154.192.137.72',NULL,'2026-04-27 11:49:34'),
(26,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:51:29'),
(27,'user',1,'login',NULL,NULL,1,'154.192.137.72','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-27 11:51:31'),
(28,'document',5,'status_changed','{\"status\":\"under_review\"}','{\"status\":\"approved\"}',1,'154.192.137.72',NULL,'2026-04-27 11:53:12'),
(29,'document',5,'status_changed','{\"status\":\"approved\"}','{\"status\":\"issued\"}',1,'154.192.137.72',NULL,'2026-04-27 11:53:27'),
(30,'document',5,'downloaded',NULL,NULL,1,'154.192.137.72',NULL,'2026-04-27 11:53:37'),
(31,'document',5,'downloaded',NULL,NULL,1,'154.192.137.72',NULL,'2026-04-27 11:54:03'),
(32,'user',1,'login',NULL,NULL,1,'154.198.84.231','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1','2026-04-27 13:31:28'),
(33,'user',1,'login',NULL,NULL,1,'154.198.84.231','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1','2026-04-27 13:31:33'),
(34,'document',1,'status_changed','{\"status\":\"draft\"}','{\"status\":\"under_review\"}',1,'154.198.84.231',NULL,'2026-04-27 13:32:39'),
(35,'user',1,'login',NULL,NULL,1,'154.192.136.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 04:47:40'),
(36,'user',1,'login',NULL,NULL,1,'154.192.136.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 04:47:43'),
(37,'moc',0,'monthly_digest',NULL,'{\"month\":\"2026-04\",\"total\":0,\"by_stage\":{},\"by_status\":{}}',NULL,NULL,NULL,'2026-04-28 05:22:16'),
(38,'user',1,'login',NULL,NULL,1,'154.192.136.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 06:16:42'),
(39,'user',2,'created',NULL,'{\"email\":\"aqib@company.com\",\"department_code\":\"HSE\"}',1,'154.192.136.1',NULL,'2026-04-28 06:18:37'),
(40,'user',2,'login',NULL,NULL,2,'154.192.136.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 06:18:50'),
(41,'user',1,'login',NULL,NULL,1,'154.192.136.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 06:19:18'),
(42,'moc',0,'monthly_digest',NULL,'{\"month\":\"2026-04\",\"total\":0,\"by_stage\":{},\"by_status\":{}}',NULL,NULL,NULL,'2026-04-28 17:28:51'),
(43,'user',1,'login',NULL,NULL,1,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 17:29:28'),
(44,'user',1,'login',NULL,NULL,1,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-28 17:30:54'),
(45,'moc',0,'monthly_digest',NULL,'{\"month\":\"2026-04\",\"total\":0,\"by_stage\":{},\"by_status\":{}}',NULL,NULL,NULL,'2026-04-28 17:35:45'),
(46,'moc',1,'created',NULL,'{\"classification\":\"pending\",\"risk_level\":\"pending\",\"initiated_at\":\"2026-04-28T17:37:33.494Z\",\"id\":1,\"moc_number\":\"MOC-CIVIL-Mari-2026-0001\",\"doc_kind\":\"moc\",\"title\":\"First MOC\",\"department_code\":\"CIVIL\",\"field_name\":\"Mari\",\"duration\":\"temporary\",\"expiry_date\":\"2026-08-14\",\"type_subcategory\":\"operations\",\"category\":\"D\",\"priority\":\"2\",\"is_capital_project\":false,\"background\":\"heloo this is backfound\",\"proposed_modification\":\"this is proposed modications\",\"anticipated_benefit\":\"this is Anticipated Benefit\",\"job_dependency\":\"load_reduction\",\"required_completion_date\":\"2026-09-24\",\"jre_user_id\":2,\"originator_id\":1,\"notes\":\"this is notes\",\"stage\":1,\"status\":\"draft\",\"updatedAt\":\"2026-04-28T17:37:33.497Z\",\"createdAt\":\"2026-04-28T17:37:33.497Z\"}',1,'140.235.80.28',NULL,'2026-04-28 17:37:33'),
(47,'moc',0,'monthly_digest',NULL,'{\"month\":\"2026-04\",\"total\":1,\"by_stage\":{\"1\":1},\"by_status\":{\"draft\":1}}',NULL,NULL,NULL,'2026-04-28 17:50:08'),
(48,'user',1,'login',NULL,NULL,1,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-28 18:03:31'),
(49,'user',1,'login',NULL,NULL,1,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-28 18:04:40'),
(50,'moc',2,'created',NULL,'{\"classification\":\"pending\",\"risk_level\":\"pending\",\"initiated_at\":\"2026-04-28T18:15:02.094Z\",\"id\":2,\"moc_number\":\"MOC-ENG-Dharki-2026-0001\",\"doc_kind\":\"moc\",\"title\":\"Control Valve Replacement\",\"department_code\":\"ENG\",\"field_name\":\"Dharki\",\"facility\":\"CMF\",\"area_unit\":\"Process\",\"duration\":\"temporary\",\"expiry_date\":\"2026-04-30\",\"type_subcategory\":\"facility\",\"category\":\"A\",\"priority\":\"3\",\"is_capital_project\":false,\"background\":\"Existing Control valve is not controlling the flow. To mitigate this, it is proposed to change the existing control valve with higher Cv.\",\"proposed_modification\":\"Replace existing 6\\\" ED type control valve with port 3-7/8\\\" with 7\\\" port.\",\"anticipated_benefit\":\"U/s pressure will be reduced to flow.\",\"job_dependency\":\"equipment_shutdown\",\"required_completion_date\":\"2026-06-30\",\"jre_user_id\":2,\"originator_id\":1,\"notes\":\"Specifications to be developed\",\"stage\":1,\"status\":\"draft\",\"updatedAt\":\"2026-04-28T18:15:02.101Z\",\"createdAt\":\"2026-04-28T18:15:02.101Z\"}',1,'140.235.80.28',NULL,'2026-04-28 18:15:02'),
(51,'moc',2,'form_risk_screening_saved',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:16:16'),
(52,'moc',2,'form_risk_screening_submitted',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:16:29'),
(53,'moc',2,'form_isr_saved',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:02'),
(54,'moc',2,'form_isr_submitted',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:06'),
(55,'moc',2,'form_pssr_saved',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:19'),
(56,'moc',2,'form_pssr_submitted',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:23'),
(57,'moc',2,'form_closeout_saved',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:37'),
(58,'moc',2,'form_closeout_submitted',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:40'),
(59,'moc',2,'submitted_for_review',NULL,NULL,1,'140.235.80.28',NULL,'2026-04-28 18:17:42'),
(60,'user',2,'login',NULL,NULL,2,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 18:19:14'),
(61,'user',2,'login',NULL,NULL,2,'140.235.80.28','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15','2026-04-28 18:19:29'),
(62,'moc',2,'expiry_warning',NULL,'{\"moc_number\":\"MOC-ENG-Dharki-2026-0001\",\"expiry_date\":\"2026-04-30\"}',NULL,NULL,NULL,'2026-04-28 18:46:50'),
(63,'moc',0,'monthly_digest',NULL,'{\"month\":\"2026-04\",\"total\":2,\"by_stage\":{\"1\":2},\"by_status\":{\"draft\":1,\"in_review\":1}}',NULL,NULL,NULL,'2026-04-28 18:46:50'),
(64,'user',1,'login',NULL,NULL,1,'154.192.138.51','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-29 04:25:59'),
(65,'user',13,'login',NULL,NULL,13,'154.192.138.51','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-29 05:06:02'),
(66,'moc',3,'created',NULL,'{\"initiated_at\":\"2026-04-29T05:08:51.861Z\",\"id\":3,\"moc_number\":\"MOC-ENG-Mari-2026-0001\",\"doc_kind\":\"moc\",\"title\":\"First test MOC\",\"department_code\":\"ENG\",\"field_name\":\"Mari\",\"duration\":\"permanent\",\"expiry_date\":null,\"type_subcategory\":\"facility\",\"category\":\"A\",\"priority\":\"1\",\"classification\":\"major\",\"risk_level\":\"high\",\"is_capital_project\":false,\"job_dependency\":\"equipment_shutdown\",\"required_completion_date\":\"2026-09-24\",\"jre_user_id\":8,\"originator_id\":13,\"stage\":1,\"status\":\"draft\",\"updatedAt\":\"2026-04-29T05:08:51.865Z\",\"createdAt\":\"2026-04-29T05:08:51.865Z\"}',13,'154.192.138.51',NULL,'2026-04-29 05:08:51'),
(67,'moc',3,'form_risk_screening_saved',NULL,NULL,13,'154.192.138.51',NULL,'2026-04-29 05:10:49'),
(68,'moc',3,'form_isr_saved',NULL,NULL,13,'154.192.138.51',NULL,'2026-04-29 05:11:11'),
(69,'moc',3,'form_pssr_saved',NULL,NULL,13,'154.192.138.51',NULL,'2026-04-29 05:11:23'),
(70,'moc',3,'form_closeout_saved',NULL,NULL,13,'154.192.138.51',NULL,'2026-04-29 05:11:34'),
(71,'moc',3,'submitted_for_review',NULL,NULL,13,'154.192.138.51',NULL,'2026-04-29 05:11:38'),
(72,'user',12,'login',NULL,NULL,12,'154.192.138.51','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-29 05:12:17'),
(73,'moc',3,'step_reject',NULL,'{\"step_id\":2,\"comments\":\"i dont like it phewwww\"}',12,'154.192.138.51',NULL,'2026-04-29 05:14:50'),
(74,'user',13,'login',NULL,NULL,13,'154.192.138.51','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-29 05:16:45');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `contact_email` varchar(191) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `clients_code` (`code`),
  KEY `clients_company_name` (`company_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES
(1,'CLIENT','client company',NULL,'client@company.com',NULL,NULL,1,'2026-04-27 11:44:05','2026-04-27 11:44:05');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(50) NOT NULL,
  `title` varchar(500) NOT NULL,
  `doc_type_code` varchar(10) NOT NULL,
  `department_code` varchar(10) NOT NULL,
  `version` tinyint(3) unsigned DEFAULT 1,
  `status` enum('draft','under_review','approved','issued','cancelled') DEFAULT 'draft',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content`)),
  `file_path` varchar(500) DEFAULT NULL,
  `client_id` int(10) unsigned DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `approved_by` int(10) unsigned DEFAULT NULL,
  `issued_by` int(10) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `attachment_path` varchar(500) DEFAULT NULL,
  `attachment_original_name` varchar(500) DEFAULT NULL,
  `attachment_mime` varchar(120) DEFAULT NULL,
  `attachment_size` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  UNIQUE KEY `documents_serial_number` (`serial_number`),
  KEY `approved_by` (`approved_by`),
  KEY `issued_by` (`issued_by`),
  KEY `documents_status` (`status`),
  KEY `documents_doc_type_code` (`doc_type_code`),
  KEY `documents_department_code` (`department_code`),
  KEY `documents_client_id` (`client_id`),
  KEY `documents_project_id` (`project_id`),
  KEY `documents_created_by` (`created_by`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_5` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES
(1,'PFE-ENG-2026-0001','Wellhead Inspection Report Block 7','PFE','ENG',1,'under_review','{\"prepared_by\":\"Aqib Sohail\",\"subject\":\"Wellhead pressure test\",\"location\":\"Block 7 Field\"}','2026/04/PFE/PFE-ENG-2026-0001_v1.pdf',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:53:54','2026-04-27 13:32:39',NULL,NULL,NULL,NULL),
(2,'PFE-ENG-2026-0002','Concurrent Doc 1','PFE','ENG',1,'draft','{}','2026/04/PFE/PFE-ENG-2026-0002_v1.pdf',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:54:04','2026-04-27 10:54:04',NULL,NULL,NULL,NULL),
(3,'PFE-ENG-2026-0003','Concurrent Doc 3','PFE','ENG',1,'draft','{}','2026/04/PFE/PFE-ENG-2026-0003_v1.pdf',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:54:04','2026-04-27 10:54:04',NULL,NULL,NULL,NULL),
(4,'PFE-ENG-2026-0004','Concurrent Doc 2','PFE','ENG',1,'draft','{}','2026/04/PFE/PFE-ENG-2026-0004_v1.pdf',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:54:05','2026-04-27 10:54:05',NULL,NULL,NULL,NULL),
(5,'PFE-ENG-2026-0005','Wellhead','PFE','ENG',1,'issued','{\"revision\":\"Rev 0\",\"prepared_by\":\"System Admin\"}','2026/04/PFE/PFE-ENG-2026-0005_v1.pdf',NULL,NULL,1,NULL,1,1,'2026-04-27 11:53:12','2026-04-27 11:53:27',NULL,'2026-04-27 11:42:54','2026-04-27 11:53:27','attachments/1777290174810_6e18dz_Bringing_Warmth_to_the_Cold_kf.docx','Bringing Warmth to the Cold kf.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',17430);
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moc_approval_steps`
--

DROP TABLE IF EXISTS `moc_approval_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `moc_approval_steps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `moc_id` int(10) unsigned NOT NULL,
  `seq` int(11) NOT NULL,
  `step_type` enum('classify','approve','sme','hierarchy') NOT NULL,
  `position_code` varchar(40) DEFAULT NULL,
  `assignee_user_id` int(10) unsigned DEFAULT NULL,
  `original_assignee_user_id` int(10) unsigned DEFAULT NULL,
  `delegated_at` datetime DEFAULT NULL,
  `status` enum('pending','approved','rejected','forwarded','skipped','cancelled') NOT NULL DEFAULT 'pending',
  `comments` text DEFAULT NULL,
  `decision_by` int(10) unsigned DEFAULT NULL,
  `decision_at` datetime DEFAULT NULL,
  `classification_set` enum('minor','major') DEFAULT NULL,
  `risk_level_set` enum('low','high') DEFAULT NULL,
  `forwarded_to_step_id` int(10) unsigned DEFAULT NULL,
  `parent_step_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_moc_steps_moc` (`moc_id`,`seq`),
  KEY `idx_moc_steps_assignee` (`assignee_user_id`,`status`),
  KEY `fk_steps_decider` (`decision_by`),
  KEY `idx_steps_position` (`position_code`),
  CONSTRAINT `fk_steps_assignee` FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_steps_decider` FOREIGN KEY (`decision_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_steps_moc` FOREIGN KEY (`moc_id`) REFERENCES `mocs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moc_approval_steps`
--

LOCK TABLES `moc_approval_steps` WRITE;
/*!40000 ALTER TABLE `moc_approval_steps` DISABLE KEYS */;
INSERT INTO `moc_approval_steps` VALUES
(1,2,10,'classify',NULL,2,NULL,NULL,'pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-28 18:17:42','2026-04-28 18:17:42'),
(2,3,10,'hierarchy','field_in_charge',12,12,NULL,'rejected','i dont like it phewwww',12,'2026-04-29 05:14:50',NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(3,3,20,'hierarchy','manager_production',11,11,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(4,3,30,'hierarchy','moc_interface',10,10,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(5,3,40,'hierarchy','manager_mai',9,9,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(6,3,50,'hierarchy','engineering_manager',8,8,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(7,3,60,'hierarchy','manager_hse',7,7,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(8,3,70,'hierarchy','manager_process_ops',6,6,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(9,3,80,'hierarchy','director_hse',4,4,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(10,3,90,'hierarchy','head_edp',5,5,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50'),
(11,3,100,'hierarchy','director_ops',3,3,NULL,'cancelled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:38','2026-04-29 05:14:50');
/*!40000 ALTER TABLE `moc_approval_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moc_forms`
--

DROP TABLE IF EXISTS `moc_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `moc_forms` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `moc_id` int(10) unsigned NOT NULL,
  `form_type` enum('risk_screening','isr','pssr','closeout') NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `status` enum('draft','submitted','approved') NOT NULL DEFAULT 'draft',
  `submitted_by` int(10) unsigned DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `approved_by` int(10) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_moc_form` (`moc_id`,`form_type`),
  KEY `idx_moc_forms_status` (`status`),
  KEY `fk_forms_submitter` (`submitted_by`),
  KEY `fk_forms_approver` (`approved_by`),
  CONSTRAINT `fk_forms_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_forms_moc` FOREIGN KEY (`moc_id`) REFERENCES `mocs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_forms_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moc_forms`
--

LOCK TABLES `moc_forms` WRITE;
/*!40000 ALTER TABLE `moc_forms` DISABLE KEYS */;
INSERT INTO `moc_forms` VALUES
(1,2,'risk_screening','{\"q1\":\"yes\",\"q2\":\"no\",\"q3\":\"no\",\"q4\":\"yes\",\"q5\":\"no\",\"q6\":\"no\",\"q7\":\"yes\",\"q8\":\"no\",\"hazards\":\"\",\"mitigation\":\"\",\"classification\":\"major\",\"risk_level\":\"high\"}','submitted',1,'2026-04-28 18:16:29',NULL,NULL,NULL,'2026-04-28 18:16:16','2026-04-28 18:16:29'),
(2,2,'isr','{\"hazop\":\"na\",\"jsa\":\"no\",\"pid_redlines\":\"no\",\"relief_review\":\"no\",\"electrical_class\":\"no\",\"material_moc\":\"no\",\"training_planned\":\"na\",\"spares\":\"no\",\"actions\":\"\",\"refs\":\"\"}','submitted',1,'2026-04-28 18:17:06',NULL,NULL,NULL,'2026-04-28 18:17:02','2026-04-28 18:17:06'),
(3,2,'pssr','{\"conducted\":true,\"changes_communicated\":true,\"cat_a_actions_closed\":true,\"approved_for_startup\":true,\"walkdown_findings\":\"\",\"attendees\":\"\",\"cat_b_actions\":\"\"}','submitted',1,'2026-04-28 18:17:23',NULL,NULL,NULL,'2026-04-28 18:17:19','2026-04-28 18:17:23'),
(4,2,'closeout','{\"drawings_redlined\":true,\"procedures_updated\":true,\"cat_b_actions_closed\":true,\"construction_dossier\":true,\"temp_reverted\":true,\"verification_record\":true,\"summary\":\"\"}','submitted',1,'2026-04-28 18:17:40',NULL,NULL,NULL,'2026-04-28 18:17:37','2026-04-28 18:17:40'),
(5,3,'risk_screening','{\"q1\":\"yes\",\"q2\":\"yes\",\"q3\":\"no\",\"q4\":\"no\",\"q5\":\"yes\",\"q6\":\"yes\",\"q7\":\"yes\",\"q8\":\"yes\",\"hazards\":\"\",\"mitigation\":\"\",\"classification\":\"major\",\"risk_level\":\"high\"}','draft',NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:10:49','2026-04-29 05:10:49'),
(6,3,'isr','{\"hazop\":\"na\",\"jsa\":\"no\",\"pid_redlines\":\"no\",\"relief_review\":\"yes\",\"electrical_class\":\"yes\",\"material_moc\":\"yes\",\"training_planned\":\"yes\",\"spares\":\"yes\",\"actions\":\"\",\"refs\":\"\"}','draft',NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:11','2026-04-29 05:11:11'),
(7,3,'pssr','{\"conducted\":true,\"changes_communicated\":false,\"cat_a_actions_closed\":true,\"approved_for_startup\":false,\"walkdown_findings\":\"\",\"attendees\":\"\",\"cat_b_actions\":\"\"}','draft',NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:23','2026-04-29 05:11:23'),
(8,3,'closeout','{\"drawings_redlined\":true,\"procedures_updated\":false,\"cat_b_actions_closed\":true,\"construction_dossier\":false,\"temp_reverted\":true,\"verification_record\":false,\"summary\":\"its winf\"}','draft',NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:11:34','2026-04-29 05:11:34');
/*!40000 ALTER TABLE `moc_forms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moc_sequences`
--

DROP TABLE IF EXISTS `moc_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `moc_sequences` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kind` enum('moc','dispensation') NOT NULL,
  `department_code` varchar(20) NOT NULL,
  `field_name` varchar(120) NOT NULL,
  `year` int(11) NOT NULL,
  `last_seq` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_moc_seq_slot` (`kind`,`department_code`,`field_name`,`year`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moc_sequences`
--

LOCK TABLES `moc_sequences` WRITE;
/*!40000 ALTER TABLE `moc_sequences` DISABLE KEYS */;
INSERT INTO `moc_sequences` VALUES
(1,'moc','CIVIL','Mari',2026,1,'2026-04-28 17:37:33','2026-04-28 17:37:33'),
(2,'moc','ENG','Dharki',2026,1,'2026-04-28 18:15:02','2026-04-28 18:15:02'),
(3,'moc','ENG','Mari',2026,1,'2026-04-29 05:08:51','2026-04-29 05:08:51');
/*!40000 ALTER TABLE `moc_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mocs`
--

DROP TABLE IF EXISTS `mocs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mocs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `moc_number` varchar(80) NOT NULL,
  `doc_kind` enum('moc','dispensation') NOT NULL DEFAULT 'moc',
  `title` varchar(500) NOT NULL,
  `department_code` varchar(20) NOT NULL,
  `field_name` varchar(120) NOT NULL,
  `facility` varchar(200) DEFAULT NULL,
  `area_unit` varchar(200) DEFAULT NULL,
  `duration` enum('permanent','temporary') NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `type_subcategory` enum('facility','technology','operations','analytical_method','document_psi','subtle','emergency','approved_project') NOT NULL,
  `category` enum('A','B','C','D') NOT NULL,
  `priority` enum('1','2','3') NOT NULL,
  `classification` enum('minor','major','pending') NOT NULL DEFAULT 'pending',
  `risk_level` enum('low','high','pending') NOT NULL DEFAULT 'pending',
  `is_capital_project` tinyint(1) NOT NULL DEFAULT 0,
  `background` text DEFAULT NULL,
  `proposed_modification` text DEFAULT NULL,
  `anticipated_benefit` text DEFAULT NULL,
  `job_dependency` enum('plant_shutdown','equipment_shutdown','load_reduction','normal_work') DEFAULT NULL,
  `required_completion_date` date DEFAULT NULL,
  `stage` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `status` enum('draft','revision_required','in_review','approved','rejected','in_execution','pssr','closed','cancelled','expired') NOT NULL DEFAULT 'draft',
  `originator_id` int(10) unsigned NOT NULL,
  `jre_user_id` int(10) unsigned DEFAULT NULL,
  `client_id` int(10) unsigned DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `initiated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `execution_started_at` datetime DEFAULT NULL,
  `pssr_completed_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `expiry_warned_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `pssr_conducted` tinyint(1) DEFAULT NULL,
  `pssr_changes_communicated` tinyint(1) DEFAULT NULL,
  `pssr_cat_a_actions_closed` tinyint(1) DEFAULT NULL,
  `pssr_approved_for_startup` tinyint(1) DEFAULT NULL,
  `closeout_drawings_redlined` tinyint(1) DEFAULT NULL,
  `closeout_procedures_updated` tinyint(1) DEFAULT NULL,
  `closeout_cat_b_actions_closed` tinyint(1) DEFAULT NULL,
  `closeout_construction_dossier` tinyint(1) DEFAULT NULL,
  `closeout_temp_reverted` tinyint(1) DEFAULT NULL,
  `closeout_verification_record` tinyint(1) DEFAULT NULL,
  `closeout_summary` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_moc_number` (`moc_number`),
  KEY `idx_mocs_status` (`status`),
  KEY `idx_mocs_stage` (`stage`),
  KEY `idx_mocs_dept` (`department_code`),
  KEY `idx_mocs_class` (`classification`),
  KEY `idx_mocs_expiry` (`expiry_date`),
  KEY `idx_mocs_originator` (`originator_id`),
  KEY `idx_mocs_jre` (`jre_user_id`),
  KEY `fk_mocs_client` (`client_id`),
  KEY `fk_mocs_project` (`project_id`),
  CONSTRAINT `fk_mocs_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `fk_mocs_jre` FOREIGN KEY (`jre_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_mocs_originator` FOREIGN KEY (`originator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_mocs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mocs`
--

LOCK TABLES `mocs` WRITE;
/*!40000 ALTER TABLE `mocs` DISABLE KEYS */;
INSERT INTO `mocs` VALUES
(1,'MOC-CIVIL-Mari-2026-0001','moc','First MOC','CIVIL','Mari',NULL,NULL,'temporary','2026-08-14','operations','D','2','pending','pending',0,'heloo this is backfound','this is proposed modications','this is Anticipated Benefit','load_reduction','2026-09-24',1,'draft',1,2,NULL,NULL,'2026-04-28 17:37:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'this is notes','2026-04-28 17:37:33','2026-04-28 17:37:33'),
(2,'MOC-ENG-Dharki-2026-0001','moc','Control Valve Replacement','ENG','Dharki','CMF','Process','temporary','2026-04-30','facility','A','3','pending','pending',0,'Existing Control valve is not controlling the flow. To mitigate this, it is proposed to change the existing control valve with higher Cv.','Replace existing 6\" ED type control valve with port 3-7/8\" with 7\" port.','U/s pressure will be reduced to flow.','equipment_shutdown','2026-06-30',1,'in_review',1,2,NULL,NULL,'2026-04-28 18:15:02',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-28 18:46:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Specifications to be developed','2026-04-28 18:15:02','2026-04-28 18:46:50'),
(3,'MOC-ENG-Mari-2026-0001','moc','First test MOC','ENG','Mari',NULL,NULL,'permanent',NULL,'facility','A','1','major','high',0,NULL,NULL,NULL,'equipment_shutdown','2026-09-24',1,'revision_required',13,8,NULL,NULL,'2026-04-29 05:08:51',NULL,'2026-04-29 05:14:50','i dont like it phewwww',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 05:08:51','2026-04-29 05:14:50');
/*!40000 ALTER TABLE `mocs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(300) NOT NULL,
  `client_id` int(10) unsigned NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','on_hold','completed','cancelled') DEFAULT 'active',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `projects_code` (`code`),
  KEY `projects_client_id` (`client_id`),
  KEY `projects_status` (`status`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES
(1,'PROJECT 2','test 1',1,NULL,'active',NULL,NULL,'2026-04-27 11:44:18','2026-04-27 11:44:18');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES
(1,'admin','[\"*\", \"moc:create\", \"moc:view\", \"moc:update\"]','2026-04-27 10:53:40','2026-04-27 10:53:40'),
(2,'engineer','[\"documents:create\", \"documents:update_status\", \"clients:read\", \"projects:read\", \"projects:create\", \"moc:create\", \"moc:view\", \"moc:update\"]','2026-04-27 10:53:40','2026-04-27 10:53:40'),
(3,'approver','[\"documents:create\",\"documents:update_status\",\"clients:read\",\"projects:read\"]','2026-04-27 10:53:40','2026-04-27 10:53:40'),
(4,'viewer','[\"documents:read\",\"clients:read\",\"projects:read\"]','2026-04-27 10:53:40','2026-04-27 10:53:40'),
(5,'client','[\"documents:read\",\"clients:read\",\"projects:read\"]','2026-04-27 11:05:41','2026-04-27 11:05:41'),
(6,'moc_originator','[\"moc:create\", \"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(7,'moc_jre','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(8,'moc_dept_head','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(9,'moc_asset_mgr','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(10,'moc_ops_mgr','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(11,'moc_hse_mgr','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(12,'moc_gm_ops','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(13,'moc_gm_hse','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(14,'moc_maint_mgr','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(15,'moc_process_eng','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(16,'moc_sme','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00'),
(17,'moc_closeout_officer','[\"moc:view\", \"moc:update\"]','0000-00-00 00:00:00','0000-00-00 00:00:00');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `serial_sequences`
--

DROP TABLE IF EXISTS `serial_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `serial_sequences` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `doc_type_code` varchar(10) NOT NULL,
  `department_code` varchar(10) NOT NULL,
  `year` smallint(5) unsigned NOT NULL,
  `last_seq` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sequence_slot` (`doc_type_code`,`department_code`,`year`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `serial_sequences`
--

LOCK TABLES `serial_sequences` WRITE;
/*!40000 ALTER TABLE `serial_sequences` DISABLE KEYS */;
INSERT INTO `serial_sequences` VALUES
(1,'PFE','ENG',2026,5,'2026-04-27 10:53:54','2026-04-27 11:42:54');
/*!40000 ALTER TABLE `serial_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `department_code` varchar(10) NOT NULL DEFAULT 'GEN',
  `moc_position` varchar(40) DEFAULT NULL,
  `manager_user_id` int(10) unsigned DEFAULT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `client_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `users_email` (`email`),
  KEY `users_role_id` (`role_id`),
  KEY `users_department_code` (`department_code`),
  KEY `idx_users_client` (`client_id`),
  KEY `idx_users_moc_position` (`moc_position`),
  KEY `idx_users_manager` (`manager_user_id`),
  CONSTRAINT `fk_users_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'admin@company.com','$2a$12$drI9pt52CGCoxNK2WVOMfOQmjfZh53wmTAFI3R0WC4EA8NEW61esq','System','Admin','MGMT',NULL,NULL,1,1,'2026-04-29 04:25:59','2026-04-27 10:53:40','2026-04-29 04:25:59',NULL),
(2,'aqib@company.com','$2a$12$n6A68wMAfl.w5JcqaDI/duEkp6F1m0AI.rnWBFVQPq6qccNXtKkzq','aqib','sohail','HSE',NULL,NULL,5,1,'2026-04-28 18:19:29','2026-04-28 06:18:37','2026-04-28 18:19:29',NULL),
(3,'director.ops@mari.test','$2a$12$RqqThxe5xenZJAxE4GB/NucJiSpIf16FuuUL53SHhg6yTXGtr5S.O','Daniyal','Director-Ops','MGMT','director_ops',NULL,2,1,NULL,'2026-04-29 04:37:47','2026-04-29 04:37:47',NULL),
(4,'director.hse@mari.test','$2a$12$ZzC7SOSH.yCZQw5XIy6aneNCFW./wl9xW0DmL/jwXqdN3xhtYxP/i','Hina','Director-HSE','HSE','director_hse',3,2,1,NULL,'2026-04-29 04:37:48','2026-04-29 04:37:48',NULL),
(5,'head.edp@mari.test','$2a$12$C4gTRWECYF/cSXdOHcdfXut.pq6dvxVboMx6hzOfOkb894wyvt9du','Imran','Head-EDP','EDP','head_edp',3,2,1,NULL,'2026-04-29 04:37:48','2026-04-29 04:37:48',NULL),
(6,'mgr.processops@mari.test','$2a$12$0y72XGuTHW21nbUrQJfzCeijlAQauTyeDZ4R9VTINvTIb7Tj6z9i6','Salman','MgrProcessOps','OPS','manager_process_ops',3,2,1,NULL,'2026-04-29 04:37:48','2026-04-29 04:37:48',NULL),
(7,'mgr.hse@mari.test','$2a$12$UJIfiPG3J74tN.FCSuyrROncyshRVISf.tvQhInCnDcUhxsgCkdVa','Sana','MgrHSE','HSE','manager_hse',4,2,1,NULL,'2026-04-29 04:37:49','2026-04-29 04:37:49',NULL),
(8,'eng.mgr@mari.test','$2a$12$WFnYOPUmC0lHPfGM2JWOzOmQ96FKasjdSDxYkTzO95F4nNCfVEPMa','Faraz','EngMgr','ENG','engineering_manager',3,2,1,NULL,'2026-04-29 04:37:49','2026-04-29 04:37:49',NULL),
(9,'mgr.mai@mari.test','$2a$12$WJQWpi/o7JoVrhTiQrheHeUTuO.eFqdAU0ZY5.DMqNHlFrTRrSIZy','Bilal','MgrMAI','MAI','manager_mai',8,2,1,NULL,'2026-04-29 04:37:50','2026-04-29 04:37:50',NULL),
(10,'moc.interface@mari.test','$2a$12$HJoTqXfm0Haz8.jmiOs17O0BmVsDdf8XDp/xvSQyV6GlceW44BM3e','Adeel','MOCInterface','OPS','moc_interface',6,2,1,NULL,'2026-04-29 04:37:50','2026-04-29 04:37:50',NULL),
(11,'mgr.production@mari.test','$2a$12$QzUHRLVSL/BfSKLqsPOuH.ygt1WtMx9MOHsy2y2s26yQzvtaIBgS2','Tariq','MgrProduction','OPS','manager_production',10,2,1,NULL,'2026-04-29 04:37:51','2026-04-29 04:37:51',NULL),
(12,'field.incharge@mari.test','$2a$12$4Ni9nOE93e3sxW/mulyZQeDtR5SKIvlJDUbvxIJyA45W69o0GwWMi','Asad','FieldInCharge','OPS','field_in_charge',11,2,1,'2026-04-29 05:12:17','2026-04-29 04:37:52','2026-04-29 05:12:17',NULL),
(13,'jre.engineer@mari.test','$2a$12$mshWtosBxVVvlZydCFVepeFawzATBKB6U6YCsUKkWX3NvAtxpdnl6','Kamran','JRE-Engineer','OPS',NULL,12,2,1,'2026-04-29 05:16:45','2026-04-29 04:37:52','2026-04-29 05:16:45',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'iqraacad_Mari'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-29  1:54:21
