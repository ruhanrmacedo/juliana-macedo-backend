import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique
} from "typeorm";
import { FoodVariant } from "./FoodVariant";
import { Nutrient } from "./Nutrient";
import { SourceDocument } from "./SourceDocument";


@Entity("food_nutrients")
@Unique(["foodVariant", "nutrient"]) // um nutriente por variante
export class FoodNutrient {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => FoodVariant, (v) => v.nutrients, { onDelete: "CASCADE" })
    @JoinColumn({ name: "food_variant_id" })
    foodVariant: FoodVariant;

    @ManyToOne(() => Nutrient, (n) => n.foodNutrients, { eager: true })
    @JoinColumn({ name: "nutrient_id" })
    nutrient: Nutrient;

    @Column({ name: "value_per_100", type: "decimal", precision: 16, scale: 6, default: 0 })
    valuePer100: string;

    @Column({ name: "min_value", type: "decimal", precision: 16, scale: 6, nullable: true })
    minValue?: string;

    @Column({ name: "max_value", type: "decimal", precision: 16, scale: 6, nullable: true })
    maxValue?: string;

    @Column({ name: "std_deviation", type: "decimal", precision: 16, scale: 6, nullable: true })
    stdDeviation?: string;

    @Column({ name: "method", type: "varchar", nullable: true })
    method?: string;

    @Column({ name: "data_quality", type: "varchar", nullable: true })
    dataQuality?: string;

    @ManyToOne(() => SourceDocument, (s) => s.nutrients, { nullable: true })
    @JoinColumn({ name: "source_document_id" })
    sourceDocument?: SourceDocument | null;
}
