import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn
} from "typeorm";
import { Meal } from "./Meal";
import { FoodVariant } from "../food/FoodVariant";
import { HouseholdMeasure } from "../food/HouseholdMeasure";

@Entity("meal_items")
export class MealItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Meal, (m) => m.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "meal_id" })
    meal: Meal;

    // alimento selecionado (variação/preparo)
    @ManyToOne(() => FoodVariant, { onDelete: "RESTRICT", eager: true })
    @JoinColumn({ name: "food_variant_id" })
    foodVariant: FoodVariant;

    // medida caseira escolhida (opcional)
    @ManyToOne(() => HouseholdMeasure, { nullable: true, eager: true })
    @JoinColumn({ name: "measure_id" })
    measure?: HouseholdMeasure | null;

    // multiplicador da medida (ex.: 2 x "colher de sopa")
    @Column({ type: "decimal", precision: 10, scale: 3, default: 1 })
    quantity: string;

    // override direto em g/mL (opcional). Se preenchido, ignora measure+quantity
    @Column({ name: "grams_ml", type: "decimal", precision: 12, scale: 3, nullable: true })
    gramsMl?: string;

    @Column({ type: "text", nullable: true })
    notes?: string;

    // Campo para ordenação dentro da refeição
    @Column({ type: "int", default: 0 })
    order: number;
}
