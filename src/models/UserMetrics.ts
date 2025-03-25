import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User";
import { NivelAtividade } from "./enums/NivelAtividade";

@Entity("user_metrics")
export class UserMetrics {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.metrics)
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column("decimal", { precision: 5, scale: 2 })
    peso: number;

    @Column("decimal", { precision: 5, scale: 2 })
    altura: number;

    @Column("int")
    idade: number;

    @Column({ type: "enum", enum: ["M", "F"] })
    sexo: string;

    @Column({ type: "enum", enum: NivelAtividade, name: "nivel_atividade" })
    nivelAtividade: NivelAtividade;

    @Column("decimal", { precision: 5, scale: 2, nullable: true, name: "gordura_corporal" }) // Correto
    gorduraCorporal?: number;

    @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;
}
