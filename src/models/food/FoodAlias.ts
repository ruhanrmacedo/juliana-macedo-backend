import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Food } from "./Food";

@Entity("food_aliases")
@Index(["alias"])
export class FoodAlias {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Food, (f) => f.aliases, { onDelete: "CASCADE" })
    @JoinColumn({ name: "food_id" })
    food: Food;

    @Column({ type: "varchar" })
    alias: string;

    @Column({ type: "varchar", default: "pt-BR" })
    locale: string;
}
