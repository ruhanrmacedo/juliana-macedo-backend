export class BadRequest extends Error {
    status = 400;
    constructor(msg: string) {
        super(msg);
        this.name = "BadRequest";
    }
}

export class Unauthorized extends Error {
    status = 401;
    constructor(msg: string) {
        super(msg);
        this.name = "Unauthorized";
    }
}

export class Forbidden extends Error {
    status = 403;
    constructor(msg: string) {
        super(msg);
        this.name = "Forbidden";
    }
}

export class NotFound extends Error {
    status = 404;
    constructor(msg: string) {
        super(msg);
        this.name = "NotFound";
    }
}

export function requireFields(obj: any, fields: string[]) {
    const missing = fields.filter(f => obj[f] === undefined || obj[f] === null);
    if (missing.length) throw new BadRequest("Campos obrigatórios: " + missing.join(", "));
}
