import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn
} from "typeorm";
import { MealPlan } from "./MealPlan";
import { Meal } from "./Meal";

@Entity("meal_plan_days")
export class MealPlanDay {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => MealPlan, (p) => p.days, { onDelete: "CASCADE" })
    @JoinColumn({ name: "plan_id" })
    plan: MealPlan;

    // 0..6 (Dom..Sáb) ou nulo se for "dia livre" com rótulo
    @Column({ type: "int", nullable: true })
    weekday?: number;

    @Column({ type: "varchar", nullable: true })
    label?: string; // rótulo personalizado para o dia, ex.: "Dia de descanso", "Cheat Day"

    @Column({ type: "int", default: 0 })
    order: number;

    @OneToMany(() => Meal, (m) => m.day, { cascade: true })
    meals: Meal[];
}
