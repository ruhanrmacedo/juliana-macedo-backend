"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const router = (0, express_1.Router)();
router.post("/register", UserController_1.UserController.register);
router.post("/login", UserController_1.UserController.login);
exports.default = router;
