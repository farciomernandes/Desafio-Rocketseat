import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transactionsExist = await transactionsRepository.findOne(id);

    if (!transactionsExist) {
      throw new AppError('Transaction not found');
    }
    await transactionsRepository.remove(transactionsExist);
  }
}

export default DeleteTransactionService;
