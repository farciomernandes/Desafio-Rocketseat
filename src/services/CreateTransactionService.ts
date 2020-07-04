import { getCustomRepository, getRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);
    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError(`This value is not disponible!`);
    }

    let categoryCheck = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!categoryCheck) {
      categoryCheck = await categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(categoryCheck);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: categoryCheck,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
