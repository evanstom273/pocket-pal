CREATE TABLE `pet_memories` (
	`owner` text NOT NULL,
	`pet_id` text NOT NULL,
	`event_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`event_type` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`owner`, `pet_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `memories_owner_pet_time` ON `pet_memories` (`owner`,`pet_id`,`timestamp`);