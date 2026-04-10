import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { FoodVariant } from "./FoodVariant";

@Entity("household_measures")
export class HouseholdMeasure {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => FoodVariant, (v) => v.measures, { onDelete: "CASCADE" })
    @JoinColumn({ name: "food_variant_id" })
    foodVariant: FoodVariant;

    @Column()
    name: string; // nome da medida caseira, ex: "xícara", "colher de sopa"

    @Column({ type: "decimal", precision: 10, scale: 3, default: 1 })
    quantity: string; // quantidade da medida caseira, ex: 1 (xícara), 0.5 (colher de sopa)

    @Column({ type: "decimal", precision: 12, scale: 3, nullable: true })
    grams?: string; // equivalente em gramas

    @Column({ type: "decimal", precision: 12, scale: 3, nullable: true })
    milliliters?: string; // equivalente em mililitros

    // se true, é a medida padrão para esse alimento (ex: 1 fatia de pão, 1 unidade de maçã)
    // apenas uma medida pode ser padrão por variante

    @Column({ name: "is_default", default: false })
    isDefault: boolean;

    @Column({ type: "varchar", nullable: true })
    notes?: string;
}