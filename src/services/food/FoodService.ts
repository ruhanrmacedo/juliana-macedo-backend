import { FoodReader } from "./FoodReader";
import { FoodWriter } from "./FoodWriter";
import type {
    CreateFoodInput, UpdateFoodInput, FoodListFilters, RequesterContext
} from "../../types/types";

export const FoodService = {
    listFoods: (filters: FoodListFilters = {}) => FoodReader.listFoods(filters),
    getFoodById: (id: number) => FoodReader.getFoodById(id),
    createFood: (input: CreateFoodInput, requester?: RequesterContext) =>
        FoodWriter.createFood(input, requester),
    updateFood: (id: number, input: UpdateFoodInput, requester?: RequesterContext) =>
        FoodWriter.updateFood(id, input, requester),
    setActiveState: (id: number, isActive: boolean, requester?: RequesterContext) =>
        FoodWriter.setActiveState(id, isActive, requester),
};
