import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddCommunicationIndexes1715700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Composite index for fetching/ensuring conversations efficiently
        await queryRunner.createIndex(
            "conversations",
            new TableIndex({
                name: "idx_conversations_tenant_type_branch",
                columnNames: ["tenant_id", "type", "branch_id"]
            })
        );

        // Composite index for ordering messages within a conversation
        await queryRunner.createIndex(
            "messages",
            new TableIndex({
                name: "idx_messages_conversation_created",
                columnNames: ["conversation_id", "created_at"]
            })
        );

        // Composite index for unread counts and read-status updates
        await queryRunner.createIndex(
            "messages",
            new TableIndex({
                name: "idx_messages_conversation_sender",
                columnNames: ["conversation_id", "sender_id"]
            })
        );

        // Index for filtering unread messages directly
        await queryRunner.createIndex(
            "messages",
            new TableIndex({
                name: "idx_messages_is_read",
                columnNames: ["is_read"]
            })
        );

        // Index on user_id for message_reads to speed up left joins filtering by user_id
        await queryRunner.createIndex(
            "message_reads",
            new TableIndex({
                name: "idx_message_reads_user_id",
                columnNames: ["user_id"]
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("message_reads", "idx_message_reads_user_id");
        await queryRunner.dropIndex("messages", "idx_messages_is_read");
        await queryRunner.dropIndex("messages", "idx_messages_conversation_sender");
        await queryRunner.dropIndex("messages", "idx_messages_conversation_created");
        await queryRunner.dropIndex("conversations", "idx_conversations_tenant_type_branch");
    }
}
