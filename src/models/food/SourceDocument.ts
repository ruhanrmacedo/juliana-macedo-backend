import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, OneToMany
} from "typeorm";
import { FoodNutrient } from "./FoodNutrient";

@Entity("source_documents")
export class SourceDocument {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string; // "TACO - 4ª edição" / "TBCA 7.2" / "Rótulo Nestlé"

    @Column({ type: "varchar", nullable: true })
    organization?: string; // "UNICAMP", "USDA", "Nestlé"

    @Column({ type: "varchar", nullable: true })
    edition?: string; // "4ª edição", "7.2", "2020"

    @Column({ type: "int", nullable: true })
    year?: number;

    @Column({ type: "varchar", nullable: true })
    url?: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @OneToMany(() => FoodNutrient, (fn) => fn.sourceDocument)
    nutrients!: FoodNutrient[];
}
