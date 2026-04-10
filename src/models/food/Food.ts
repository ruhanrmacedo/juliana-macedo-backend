import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    OneToMany, ManyToOne, JoinColumn, Index
} from "typeorm";
import { FoodTexture } from "../enums/FoodTexture";
import { UnitBase } from "../enums/UnitBase";
import { FoodSourceType } from "../enums/FoodSourceType";
import { User } from "../User";
import { FoodAlias } from "./FoodAlias";
import { FoodVariant } from "./FoodVariant";


@Entity("foods")
@Index(["name", "category"])
export class Food {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // nome comum do alimento

    @Column({ name: "scientific_name", type: "varchar", nullable: true })
    scientificName: string | null;

    @Column({ type: "varchar", nullable: true })
    category: string | null;

    @Column({ type: "enum", enum: FoodTexture, default: FoodTexture.SOLIDO })
    textura: FoodTexture;

    @Column({ name: "unit_base", type: "enum", enum: UnitBase, default: UnitBase.GRAMA })
    unitBase: UnitBase; // define se os nutrientes estão por 100 g ou 100 ml

    @Column({ name: "density_g_ml", type: "decimal", precision: 10, scale: 3, nullable: true })
    densityGPerMl: string | null; // útil para líquidos/poções ** GPT me explique mais sobre isso **

    @Column({ name: "source_type", type: "enum", enum: FoodSourceType, default: FoodSourceType.USER })
    sourceType: FoodSourceType;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "owner_id" })
    owner?: User | null;

    @Column({ name: "is_active", default: true })
    isActive: boolean;

    @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @OneToMany(() => FoodVariant, (v) => v.food)
    variants!: FoodVariant[];

    @OneToMany(() => FoodAlias, (a) => a.food)
    aliases!: FoodAlias[];
}
