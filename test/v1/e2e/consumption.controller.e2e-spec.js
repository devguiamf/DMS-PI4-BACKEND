import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest'
import supertest from 'supertest'
import { faker } from '@faker-js/faker'
import MockDate from 'mockdate'
import moment from 'moment'
import { server } from '../../../src/v1/config/server'
import sequelize from '../../../src/v1/config/database/sequelize-db'
import { dropTables, migrateTables } from '../../../src/v1/config/database/migrate-database'

describe('Consumption E2E Suite', () => {
  async function makeUser() {
    const user = {
      name: faker.name.firstName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    }

    const [id] = await sequelize.query(
      `
      INSERT INTO Users (Name, Login, Password) VALUES
       ('${user.name}', '${user.email}', '${user.password}');`
    )
    user.id = id
    return user
  }

  async function makeProduct(user) {
    const product = {
      name: 'Product 1',
      uuid: faker.datatype.uuid(),
      userId: user.id,
    }

    const [id] = await sequelize.query(
      `
      INSERT INTO Products (Name, UUID, idUser) VALUES
        ('${product.name}', '${product.uuid}', '${product.userId}');`
    )
    product.id = id

    return product
  }

  async function makeConsumption(product) {
    const consumption = {
      current: faker.datatype.number(),
      power: faker.datatype.number(),
      kwm: faker.datatype.number(),
      kwmDate: faker.date.recent(),
      idProduct: product.id,
    }

    const [id] = await sequelize.query(
      `
      INSERT INTO ConsumptionData (EletricCurrent, Power, KwmDate, Kwm, idProduct) VALUES
        (:current, :power, :kwmDate, :kwm, :idProduct);
      `,
      {
        replacements: {
          current: consumption.current,
          power: consumption.power,
          kwmDate: consumption.kwmDate,
          kwm: consumption.kwm,
          idProduct: consumption.idProduct,
        },
        type: sequelize.QueryTypes.INSERT,
      }
    )
    consumption.id = id

    return consumption
  }
  describe('POST /consumption', () => {
    const actualDate = new Date()
    beforeAll(() => {
      MockDate.set(actualDate)
    })
    beforeEach(async () => {
      await migrateTables()
    })

    afterEach(async () => {
      await dropTables()
    })

    afterAll(async () => {
      MockDate.reset()
    })

    test('should save the consumption converted on the database', async () => {
      const user = await makeUser()
      const product = await makeProduct(user)

      const given = {
        current: 2.5,
        power: 62.5,
        idProduct: product.id,
      }

      const response = await supertest(server.listener)
        .post('/consumption')
        .send(given)

      expect(response.status).toBe(201)

      const [[dbConsumption]] = await sequelize.query(
        `SELECT * FROM ConsumptionData;`
      )

      const expectedKwm = 0.001042

      const expectedConsumption = {
        id: expect.any(Number),
        Power: given.power,
        EletricCurrent: given.current,
        Kwm: expectedKwm,
        KwmDate: moment(actualDate).format('yyyy-MM-dd HH:mm:ss'),
        idProduct: given.idProduct,
      }

      expect({
        ...dbConsumption,
        KwmDate: moment(dbConsumption.KwmDate).format('yyyy-MM-dd HH:mm:ss'),
      }).toEqual(expectedConsumption)
    })
  })
})