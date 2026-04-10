import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn
} from "typeorm";
import { MealPlan } from "./MealPlan";
import { MealPlanDay } from "./MealPlanDay";
import { MealItem } from "./MealItem";

@Entity("meals")
export class Meal {
    @PrimaryGeneratedColumn()
    id: number;

    // Pode pertencer diretamente a um plano...
    @ManyToOne(() => MealPlan, (p) => p.meals, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "plan_id" })
    plan?: MealPlan | null;

    // ...ou a um dia específico do plano
    @ManyToOne(() => MealPlanDay, (d) => d.meals, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "day_id" })
    day?: MealPlanDay | null;

    @Column()
    name: string; // "Café da manhã", "Almoço", "Pré-treino"

    @Column({ type: "time", name: "scheduled_time", nullable: true })
    scheduledTime?: string; // "08:00", "12:30" (opcional)

    @Column({ type: "int", default: 0 })
    order: number;

    @OneToMany(() => MealItem, (i) => i.meal, { cascade: true })
    items: MealItem[];
}
