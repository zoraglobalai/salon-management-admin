import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateCommunicationsSchema1715600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Conversations Table
        await queryRunner.createTable(new Table({
            name: "conversations",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "tenant_id", type: "uuid" },
                { name: "type", type: "varchar", length: "20" }, // 'DIRECT' or 'BROADCAST'
                { name: "branch_id", type: "uuid", isNullable: true },
                { name: "created_by", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        // 2. Create Messages Table
        await queryRunner.createTable(new Table({
            name: "messages",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "conversation_id", type: "uuid" },
                { name: "sender_id", type: "uuid" },
                { name: "content", type: "text" },
                { name: "message_type", type: "varchar", length: "20", default: "'TEXT'" },
                { name: "created_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        // 3. Create Message Reads Table
        await queryRunner.createTable(new Table({
            name: "message_reads",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "message_id", type: "uuid" },
                { name: "user_id", type: "uuid" },
                { name: "read_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        // 4. Add Foreign Keys
        await queryRunner.createForeignKeys("messages", [
            new TableForeignKey({
                columnNames: ["conversation_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "conversations",
                onDelete: "CASCADE"
            }),
            new TableForeignKey({
                columnNames: ["sender_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        ]);

        await queryRunner.createForeignKeys("message_reads", [
            new TableForeignKey({
                columnNames: ["message_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "messages",
                onDelete: "CASCADE"
            }),
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        ]);

        // 5. Add Indexes
        await queryRunner.createIndex("conversations", new TableIndex({ columnNames: ["tenant_id"] }));
        await queryRunner.createIndex("conversations", new TableIndex({ columnNames: ["branch_id"] }));
        await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["conversation_id"] }));
        await queryRunner.createIndex("messages", new TableIndex({ columnNames: ["created_at"] }));
        await queryRunner.createIndex("message_reads", new TableIndex({ columnNames: ["message_id", "user_id"], isUnique: true }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("message_reads");
        await queryRunner.dropTable("messages");
        await queryRunner.dropTable("conversations");
    }
}
