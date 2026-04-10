import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    OneToMany, Unique, CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { Food } from "./Food";
import { HouseholdMeasure } from "./HouseholdMeasure";
import { FoodNutrient } from "./FoodNutrient";

@Entity("food_variants")
@Unique(["food", "description"])
export class FoodVariant {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Food, (f) => f.variants, { onDelete: "CASCADE" })
    @JoinColumn({ name: "food_id" })
    food: Food;

    @Column()
    description: string;

    @Column({ name: "preparation_method", type: "varchar", nullable: true })
    preparationMethod?: string;

    @Column({ name: "moisture_factor", type: "decimal", precision: 8, scale: 4, nullable: true })
    moistureFactor: string | null;

    @Column({ name: "default_portion", type: "decimal", precision: 10, scale: 3, nullable: true })
    defaultPortionGml: string | null;

    @Column({ name: "is_default", default: false })
    isDefault: boolean;

    @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @OneToMany(() => HouseholdMeasure, (m) => m.foodVariant)
    measures!: HouseholdMeasure[];

    @OneToMany(() => FoodNutrient, (n) => n.foodVariant)
    nutrients!: FoodNutrient[];
}
