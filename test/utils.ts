import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/lib/function'

export const assertLeft = <E, A = unknown>(either: E.Either<E, A>, onLeft: (e: E) => void) =>
  pipe(
    either,
    E.fold(onLeft, right => {
      // tslint:disable-next-line no-console
      console.log(right)

      throw new Error('Expected Left')
    })
  )

export const assertRight = <A, E = unknown>(either: E.Either<E, A>, onRight: (e: A) => void) =>
  pipe(
    either,
    E.fold(left => {
      // tslint:disable-next-line no-console
      console.log(left)

      throw new Error('Expected Right')
    }, onRight)
  )
