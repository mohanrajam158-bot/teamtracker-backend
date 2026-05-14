-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: team_tracker
-- ------------------------------------------------------
-- Server version	8.0.41

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
-- Table structure for table `deleted_chat_messages`
--

DROP TABLE IF EXISTS `deleted_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_delete_per_user` (`message_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deleted_chat_messages`
--

LOCK TABLES `deleted_chat_messages` WRITE;
/*!40000 ALTER TABLE `deleted_chat_messages` DISABLE KEYS */;
INSERT INTO `deleted_chat_messages` VALUES (1,224,77,'2026-05-01 15:17:54'),(2,223,77,'2026-05-01 15:18:05');
/*!40000 ALTER TABLE `deleted_chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_messages`
--

DROP TABLE IF EXISTS `team_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` varchar(50) DEFAULT NULL,
  `sender_name` varchar(100) DEFAULT NULL,
  `message` text,
  `team_id` varchar(50) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_seen_by_tl` tinyint(1) DEFAULT '0',
  `message_type` varchar(20) DEFAULT 'text',
  `media_url` varchar(255) DEFAULT NULL,
  `reply_to_id` int DEFAULT NULL,
  `reply_to_message` text,
  `reply_to_sender` varchar(100) DEFAULT NULL,
  `sender_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=231 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_messages`
--

LOCK TABLES `team_messages` WRITE;
/*!40000 ALTER TABLE `team_messages` DISABLE KEYS */;
INSERT INTO `team_messages` VALUES (198,'76','mark','hii','4','employee','2026-04-30 19:48:57',0,'text',NULL,NULL,NULL,NULL,76),(199,'76','mark','hii','4','employee','2026-04-30 19:49:06',0,'text',NULL,NULL,NULL,NULL,76),(200,'76','mark','hiii','4','employee','2026-04-30 19:49:10',0,'text',NULL,NULL,NULL,NULL,76),(201,'76','mark','hiio','4','employee','2026-04-30 19:49:13',0,'text',NULL,NULL,NULL,NULL,76),(204,'76','mark','hii','3','employee','2026-04-30 19:51:45',0,'text',NULL,NULL,NULL,NULL,76),(205,'76','mark','hiii','3','employee','2026-04-30 19:51:50',0,'text',NULL,NULL,NULL,NULL,76),(206,'76','mark','hiii','8','employee','2026-04-30 19:52:43',0,'text',NULL,NULL,NULL,NULL,76),(207,'76','mark','hio','4','employee','2026-05-01 14:06:22',0,'text',NULL,NULL,NULL,NULL,76),(212,'48','Mohan Raja.M','hii','1','employee','2026-05-01 14:21:54',0,'text',NULL,NULL,NULL,NULL,48),(213,'48','Mohan Raja.M','hello','1','employee','2026-05-01 14:29:55',0,'text',NULL,NULL,NULL,NULL,48),(214,'48','Mohan Raja.M','hii','1','employee','2026-05-01 14:30:18',0,'text',NULL,NULL,NULL,NULL,48),(215,'48','Mohan Raja.M','hii','1','employee','2026-05-01 14:30:31',0,'text',NULL,NULL,NULL,NULL,48),(216,'77','mike','hii bro','1','employee','2026-05-01 14:31:23',0,'text',NULL,NULL,NULL,NULL,77),(217,'77','mike','how are you','1','employee','2026-05-01 14:31:35',0,'text',NULL,NULL,NULL,NULL,77),(218,'9','Team Leader','hi guys','1','tl','2026-05-01 14:33:14',0,'text',NULL,NULL,NULL,NULL,9),(219,'9','Team Leader','hi','1','tl','2026-05-01 14:33:32',0,'text',NULL,NULL,NULL,NULL,9),(222,'71','mark','hi','2','tl','2026-05-01 15:16:21',0,'text',NULL,NULL,NULL,NULL,71),(223,'71','mark','hello','2','tl','2026-05-01 15:16:42',0,'text',NULL,NULL,NULL,NULL,71),(224,'77','mike','hiiiiiiiii','2','employee','2026-05-01 15:17:08',0,'text',NULL,NULL,NULL,NULL,77),(226,'77','mike','hay','2','employee','2026-05-01 15:17:51',0,'text',NULL,NULL,NULL,NULL,77),(227,'71','mark','hiii','2','tl','2026-05-01 16:46:43',0,'text',NULL,NULL,NULL,NULL,71),(228,'48','Mohan Raja.M','hello','1','employee','2026-05-01 16:47:15',0,'text',NULL,NULL,NULL,NULL,48),(229,'48','Mohan Raja.M','ok','1','employee','2026-05-01 16:48:09',0,'audio','1777654089562_449416395.jpg',NULL,NULL,NULL,48),(230,'77','mike','hi','2','employee','2026-05-01 19:28:15',0,'text',NULL,NULL,NULL,NULL,77);
/*!40000 ALTER TABLE `team_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tl_announcement_reads`
--

DROP TABLE IF EXISTS `tl_announcement_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tl_announcement_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `announcement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_read` (`announcement_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tl_announcement_reads`
--

LOCK TABLES `tl_announcement_reads` WRITE;
/*!40000 ALTER TABLE `tl_announcement_reads` DISABLE KEYS */;
INSERT INTO `tl_announcement_reads` VALUES (1,1,6,'2026-03-18 10:57:59'),(2,2,6,'2026-03-18 15:17:53'),(3,3,6,'2026-03-18 15:17:53'),(4,4,6,'2026-03-18 15:17:53'),(5,5,6,'2026-03-23 05:45:48'),(6,9,6,'2026-03-23 05:45:48'),(7,10,6,'2026-03-23 06:21:22'),(8,11,6,'2026-03-23 06:21:22'),(9,12,6,'2026-03-23 06:34:54'),(10,13,6,'2026-03-23 06:43:45'),(11,14,6,'2026-03-26 04:33:54'),(12,15,6,'2026-03-26 04:33:54'),(13,16,6,'2026-03-26 05:38:33'),(14,18,6,'2026-04-06 18:42:36'),(15,19,6,'2026-04-07 17:54:01'),(16,20,6,'2026-04-07 20:08:15'),(17,21,6,'2026-04-07 20:08:15'),(18,22,6,'2026-04-08 15:23:38'),(19,23,6,'2026-04-08 16:51:35'),(20,24,6,'2026-04-08 16:51:35'),(21,26,6,'2026-04-08 16:51:35'),(22,1,46,'2026-04-08 19:30:14'),(23,2,46,'2026-04-08 19:30:14'),(24,3,46,'2026-04-08 19:30:14'),(25,5,46,'2026-04-08 19:30:14'),(26,9,46,'2026-04-08 19:30:14'),(27,10,46,'2026-04-08 19:30:14'),(28,12,46,'2026-04-08 19:30:14'),(29,13,46,'2026-04-08 19:30:14'),(30,14,46,'2026-04-08 19:30:14'),(31,16,46,'2026-04-08 19:30:14'),(32,18,46,'2026-04-08 19:30:14'),(33,19,46,'2026-04-08 19:30:14'),(34,20,46,'2026-04-08 19:30:14'),(35,21,46,'2026-04-08 19:30:14'),(36,22,46,'2026-04-08 19:30:14'),(37,23,46,'2026-04-08 19:30:14'),(38,24,46,'2026-04-08 19:30:14'),(39,26,46,'2026-04-08 19:30:14'),(40,1,48,'2026-04-08 19:39:19'),(41,2,48,'2026-04-08 19:39:19'),(42,3,48,'2026-04-08 19:39:19'),(43,5,48,'2026-04-08 19:39:19'),(44,9,48,'2026-04-08 19:39:19'),(45,10,48,'2026-04-08 19:39:19'),(46,12,48,'2026-04-08 19:39:19'),(47,13,48,'2026-04-08 19:39:19'),(48,14,48,'2026-04-08 19:39:19'),(49,16,48,'2026-04-08 19:39:19'),(50,18,48,'2026-04-08 19:39:19'),(51,19,48,'2026-04-08 19:39:19'),(52,20,48,'2026-04-08 19:39:19'),(53,21,48,'2026-04-08 19:39:19'),(54,22,48,'2026-04-08 19:39:19'),(55,23,48,'2026-04-08 19:39:19'),(56,24,48,'2026-04-08 19:39:19'),(57,26,48,'2026-04-08 19:39:19'),(58,27,48,'2026-04-08 19:44:19'),(59,29,48,'2026-04-08 20:06:34'),(60,30,48,'2026-04-09 18:32:26'),(61,31,48,'2026-04-16 18:10:05'),(62,32,48,'2026-04-22 18:32:27'),(63,33,48,'2026-04-28 15:45:51'),(66,37,48,'2026-04-28 18:51:33'),(103,35,77,'2026-05-03 15:32:27'),(104,38,77,'2026-05-03 15:32:27'),(105,40,77,'2026-05-03 15:32:27');
/*!40000 ALTER TABLE `tl_announcement_reads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tl_announcement_replies`
--

DROP TABLE IF EXISTS `tl_announcement_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tl_announcement_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `announcement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tl_announcement_replies`
--

LOCK TABLES `tl_announcement_replies` WRITE;
/*!40000 ALTER TABLE `tl_announcement_replies` DISABLE KEYS */;
INSERT INTO `tl_announcement_replies` VALUES (1,11,6,'Mohanraja','ok','2026-03-23 06:21:31'),(2,10,6,'Mohanraja','ok tl','2026-03-23 06:21:46'),(3,12,6,'Mohanraja','tell me','2026-03-23 06:35:00'),(4,13,6,'Mohanraja','hello','2026-03-23 06:43:56'),(5,13,6,'Mohanraja','hi','2026-03-23 06:45:26'),(6,15,6,'Mohanraja','tell me','2026-03-26 04:34:00'),(7,16,6,'Mohanraja','hello','2026-03-26 05:38:38'),(8,16,6,'Mohanraja','welcome','2026-03-26 05:38:51'),(9,18,6,'Mohanraja','ok','2026-04-06 18:42:55'),(10,26,6,'Mohanraja','ok','2026-04-08 16:51:48'),(11,27,48,'Mohan Raja.M','ok','2026-04-08 19:50:53'),(12,29,48,'Mohan Raja.M','hello','2026-04-08 20:06:39'),(13,30,48,'Mohan Raja.M','hello','2026-04-09 18:32:32'),(14,31,48,'Mohan Raja.M','ok tl','2026-04-16 18:10:16'),(15,32,48,'Mohan Raja.M','hi','2026-04-22 18:32:40'),(16,33,48,'Mohan Raja.M','hi','2026-04-28 15:45:58');
/*!40000 ALTER TABLE `tl_announcement_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tl_announcements`
--

DROP TABLE IF EXISTS `tl_announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tl_announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `team_id` varchar(50) NOT NULL,
  `sender_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `edited_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `media_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tl_announcements`
--

LOCK TABLES `tl_announcements` WRITE;
/*!40000 ALTER TABLE `tl_announcements` DISABLE KEYS */;
INSERT INTO `tl_announcements` VALUES (1,'bock_7e_Math_print','guy\'s this title is very important pls do carefully......lh','1','Team Leader','2026-03-18 10:56:45','2026-03-18 11:49:20',NULL,NULL),(2,'macbook','hii...hi','1','Team Leader','2026-03-18 11:57:08','2026-03-18 12:46:01',NULL,NULL),(3,'android','this is vivo and poco and xiomi','1','Team Leader','2026-03-18 12:46:42','2026-03-18 13:02:51',NULL,NULL),(5,'macbook.','iphone is very expensive 🙂','1','Team Leader','2026-03-19 14:13:33','2026-03-19 15:12:01',NULL,NULL),(9,'bock_book','change remdiation..','1','Team Leader','2026-03-23 05:45:30','2026-03-23 05:45:36',NULL,NULL),(10,'mollica','give page break..','1','Team Leader','2026-03-23 06:12:20','2026-03-23 06:12:53',NULL,NULL),(12,'hello','hi sir','1','Team Leader','2026-03-23 06:34:28',NULL,NULL,NULL),(13,'bock','hi','1','Team Leader','2026-03-23 06:43:11',NULL,NULL,NULL),(14,'hi','welcome','1','Team Leader','2026-03-23 06:45:59',NULL,NULL,NULL),(16,'hi','hello friends','1','Team Leader','2026-03-26 05:37:27',NULL,NULL,NULL),(18,'Martin','page break','1','Team Leader','2026-04-06 18:41:46',NULL,NULL,NULL),(19,'hi','this is important','1','Team Leader','2026-04-07 17:53:11',NULL,NULL,NULL),(20,'hello','welcome','1','Team Leader','2026-04-07 19:13:21',NULL,NULL,NULL),(21,'MacBook','this is expensive','1','Team Leader','2026-04-07 19:32:11',NULL,NULL,NULL),(22,'gi','gi','1','Team Leader','2026-04-07 20:58:23',NULL,NULL,NULL),(23,'hiiiiioi','hiiiii','1',NULL,'2026-04-08 16:42:01',NULL,NULL,NULL),(24,'hello','hhi','1',NULL,'2026-04-08 16:43:27',NULL,NULL,NULL),(26,'hello','I am vijay..','1',NULL,'2026-04-08 16:48:11','2026-04-08 16:51:09',NULL,NULL),(27,'gii','hhjh','1',NULL,'2026-04-08 19:42:46',NULL,NULL,NULL),(29,'hi','hello','1',NULL,'2026-04-08 20:05:50',NULL,NULL,NULL),(30,'hello','hello','1',NULL,'2026-04-09 06:36:25',NULL,NULL,NULL),(31,'bock','hhh','1',NULL,'2026-04-16 16:19:42',NULL,NULL,NULL),(32,'hi','hello','1',NULL,'2026-04-22 17:27:27',NULL,NULL,NULL),(33,'h','hhh','1',NULL,'2026-04-28 15:44:04',NULL,NULL,NULL),(35,'hi','hello..','2',NULL,'2026-04-28 17:01:03','2026-04-28 17:01:16',NULL,'1777395663887_579598710.jpg'),(37,'hello','hi','1',NULL,'2026-04-28 18:37:19',NULL,NULL,'1777401439154_367584737.jpg'),(38,'hi','hello friends','2',NULL,'2026-04-30 17:18:22',NULL,NULL,NULL),(40,'hi','hello...','2',NULL,'2026-04-30 18:00:34','2026-04-30 18:00:44',NULL,'1777572034612_599466072.jpg');
/*!40000 ALTER TABLE `tl_announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `updates`
--

DROP TABLE IF EXISTS `updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `work_description` text,
  `hours` int DEFAULT NULL,
  `blocker` text,
  `date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user` (`user_id`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `updates`
--

LOCK TABLES `updates` WRITE;
/*!40000 ALTER TABLE `updates` DISABLE KEYS */;
/*!40000 ALTER TABLE `updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_tokens`
--

DROP TABLE IF EXISTS `user_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `fcm_token` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_tokens`
--

LOCK TABLES `user_tokens` WRITE;
/*!40000 ALTER TABLE `user_tokens` DISABLE KEYS */;
INSERT INTO `user_tokens` VALUES (1,9,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-08 15:20:55'),(2,48,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-09 07:06:23'),(3,49,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-20 10:30:13'),(4,56,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-20 14:17:39'),(5,58,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-20 15:44:04'),(6,57,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-20 18:03:41'),(7,60,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-21 19:04:14'),(8,61,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-21 19:10:55'),(9,62,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-21 19:17:20'),(10,63,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-21 19:19:02'),(14,71,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-04-30 17:18:03'),(21,77,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','2026-05-01 14:31:08');
/*!40000 ALTER TABLE `user_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `empCode` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `theme_preference` varchar(20) DEFAULT 'light',
  `notification_enabled` tinyint(1) DEFAULT '1',
  `fcm_token` text,
  `team_id` varchar(50) DEFAULT NULL,
  `status` enum('active','pending','blocked') NOT NULL DEFAULT 'active',
  `apple_sub` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `apple_sub` (`apple_sub`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (9,'danu','team@gmail.com','$2b$10$1bcAJiZG7h2BxvlraMVwd.MzFWw.ym75GiRellcklywwfcgQrOUkC','tl','2026-02-18 15:46:50','IS13000','2656446466','1776797930153_875128745.jpg','dark',1,'dWCOBdx9SyCrr5JRgzhwaX:APA91bF9l_yCghAYVbeFBwblaKq-phSp2rJpenjP-Rc8Ax6TbPLg6j4NSYBjKlxSUECQ5bOR2xX1cSVxSI5bNesxZD9vgHkLWbQVEnIm1RnV11xg7F2HWMA','1','active',NULL),(48,'Mohan Raja.M','mohanrajam158@gmail.com','$2b$10$gsk5nrgy5umMDZ0DZVAl3e8anH6otr6/6PFcKmpj263QUfGu7LlDK','employee','2026-04-08 19:39:11','IS13027','6385467062','1775677699952.png','dark',1,NULL,'1','active',NULL),(58,'Admin','admin@gmail.com','$2b$10$8Jglv4ddOHFfQ/pV2nG8/OBxWx6zuU4uhFGZIHIy2SzVovI38xxZm','admin','2026-04-20 15:43:20',NULL,NULL,NULL,'light',1,NULL,'1','active',NULL),(71,'mark','genreluses@gmail.com','$2b$10$IC1u0YgmG0EpYP5KyNnAB.bd2Kh10qAnGQMCyVHpDNFGkyRAU1hlu','tl','2026-04-30 17:17:21','IS130002','7656658676','1777571876278_793743405.jpg','light',1,NULL,'2','active',NULL),(77,'thamo','traderlifeofpain@gmail.com','$2b$10$E6dfMJjEd.V4Ln5zjPDsteIa0/M4j2uqLKjDF58GiYBwmIsB/ZpzK','employee','2026-05-01 14:11:00','','',NULL,'light',0,NULL,'2','active',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work`
--

DROP TABLE IF EXISTS `work`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `team_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work`
--

LOCK TABLES `work` WRITE;
/*!40000 ALTER TABLE `work` DISABLE KEYS */;
INSERT INTO `work` VALUES (1,'hi','hiio','1','2026-04-08 15:54:51'),(2,'hi','hiii','1','2026-04-08 15:58:11'),(3,'hi','hi','1','2026-04-08 16:12:05');
/*!40000 ALTER TABLE `work` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_updates`
--

DROP TABLE IF EXISTS `work_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `description` text,
  `status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `media` varchar(255) DEFAULT NULL,
  `team_id` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `work_updates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_updates`
--

LOCK TABLES `work_updates` WRITE;
/*!40000 ALTER TABLE `work_updates` DISABLE KEYS */;
INSERT INTO `work_updates` VALUES (24,48,'hi','TL Watched','2026-04-08 19:40:44',NULL,'1'),(25,48,'hi','approved','2026-04-08 19:41:20','1775677278621.jpg','1'),(26,48,'hi tl','TL Watched','2026-04-08 20:06:52',NULL,'1'),(27,48,'hello','pending','2026-04-09 18:31:52',NULL,'1'),(28,48,'hi','TL Watched','2026-04-16 16:17:36','1776356256181.jpg','1'),(29,48,'hee','approved','2026-04-16 16:18:04',NULL,'1'),(30,48,'hello','approved','2026-04-22 18:14:29',NULL,'1'),(31,48,'hello 👋','TL Watched','2026-04-22 18:31:59',NULL,'1'),(33,48,'hi','approved','2026-04-29 15:19:40',NULL,'1');
/*!40000 ALTER TABLE `work_updates` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-06  1:22:20
