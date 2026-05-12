import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RefactorCommunicationsSchema1715600000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename 'content' to 'message' in 'messages' table
        await queryRunner.renameColumn("messages", "content", "message");

        // 2. Add 'sender_role' to 'messages' table
        await queryRunner.addColumn("messages", new TableColumn({
            name: "sender_role",
            type: "varchar",
            length: "20",
            isNullable: true // Initially nullable for existing messages
        }));

        // 3. Add 'is_read' to 'messages' table
        await queryRunner.addColumn("messages", new TableColumn({
            name: "is_read",
            type: "boolean",
            default: false
        }));

        // 4. Update existing messages with sender roles if possible (optional but good)
        await queryRunner.query(`
            UPDATE messages m 
            SET sender_role = u.role 
            FROM users u 
            WHERE m.sender_id = u.id
        `);

        // 5. Make sender_role NOT NULL after update
        await queryRunner.changeColumn("messages", "sender_role", new TableColumn({
            name: "sender_role",
            type: "varchar",
            length: "20",
            isNullable: false
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("messages", "is_read");
        await queryRunner.dropColumn("messages", "sender_role");
        await queryRunner.renameColumn("messages", "message", "content");
    }
}
