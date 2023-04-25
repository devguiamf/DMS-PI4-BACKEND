const joi = require('joi');

const consumptionRegister = {
    payload: joi.object({
        voltage: joi.number().required(),
        power: joi.number().required(),
        current: joi.number().required(),
        idProduct: joi.number().required()
    }).required()
}

const searchConsumptions = {
    query: joi.object({
        date_initial: joi.string(),
        date_end: joi.string(),
        amount_initial: joi.number(),
        amount_end: joi.number()
    }).required(),

    params: joi.object({
        product: joi.number().required()
    })
}

module.exports = {consumptionRegister, searchConsumptions}