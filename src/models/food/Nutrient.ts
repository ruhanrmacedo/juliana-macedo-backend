import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from "typeorm";
import { NutrientGroup } from "../enums/NutrientGroup";
import { FoodNutrient } from "./FoodNutrient";


@Entity("nutrients")
@Index(["code"], { unique: true })
export class Nutrient {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    code: string; // ex.: "208" (Energia kcal), "203" (Proteína)

    @Column()
    name: string; // "Energia", "Proteína", "Vitamina C"

    @Column()
    unit: string; // "kcal","kJ","g","mg","µg"

    @Column({ type: "enum", enum: NutrientGroup, default: NutrientGroup.OUTROS })
    group: NutrientGroup;

    @Column({ name: "display_order", type: "int", default: 0 })
    displayOrder: number;

    @Column({ name: "daily_value_ref", type: "decimal", precision: 14, scale: 4, nullable: true })
    dailyValueRef?: string; // valor de referência diária (ex.: 2000 kcal, 50 g de proteína)

    @Column({ nullable: true })
    notes?: string;

    @OneToMany(() => FoodNutrient, (fn) => fn.nutrient)
    foodNutrients!: FoodNutrient[];
}
