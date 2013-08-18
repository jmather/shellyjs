/*
Copyright (C) 2011 by Jelle Geerts

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

/* An unbeatable artificial intelligence tic-tac-toe opponent.
 *
 * The implementation uses the minimax algorithm with alpha-beta pruning.
 */

var Rules = [];

Rules.checkGameOver = function (grid)
{
  // All possible winning combination patterns.
  var patterns = [
    [[0, 2], [0, 1], [0, 0]], // Left.
    [[0, 0], [1, 0], [2, 0]], // Top.
    [[2, 0], [2, 1], [2, 2]], // Right.
    [[2, 2], [1, 2], [0, 2]], // Bottom.
    [[0, 1], [1, 1], [2, 1]], // Horizontal middle.
    [[1, 0], [1, 1], [1, 2]], // Vertical middle.
    [[0, 0], [1, 1], [2, 2]], // Top-left to bottom-right.
    [[0, 2], [1, 1], [2, 0]]  // Bottom-left to top-right.
  ];

  for (var i = 0; i < patterns.length; i++)
  {
    var accumulative = '';

    for (var j = 0; j < patterns[i].length; j++)
    {
      var point = patterns[i][j];
      accumulative += grid[point[1]][point[0]];
    }

    if (accumulative === 'XXX' || accumulative === 'OOO')
      return {'draw': false, 'winner': accumulative[0], 'pattern': patterns[i]};
  }

  for (var y = 0; y < grid.length; y++)
  {
    for (var x = 0; x < grid[y].length; x++)
    {
      if (grid[y][x] === '.') // Cell empty?
        return null; // No draw yet, a move can still be made.
    }
  }

  return {'draw': true};
};

function ArtificialIntelligence(side)
{
  this.infinity = 99;
  this.side = side;

  this.calculateMove = function (grid)
  {
    function isGridEmpty(grid)
    {
      for (var y = 0; y < grid.length; y++)
      {
        for (var x = 0; x < grid[y].length; x++)
        {
          if (grid[y][x] !== '.') // Cell not empty?
            return false;
        }
      }

      return true;
    }

    /* For more variation, return a random move on the first move, as the first move doesn't
     * matter (since perfect play results in a draw).
     */
    if (isGridEmpty(grid))
      return [Random.randint(0, grid.length - 1), Random.randint(0, grid[0].length - 1)];

    grid = grid.slice(0); // Make a copy.
    var move = this._search(grid, this.side, 0, -this.infinity, +this.infinity);
    if (move === 0)
      throw 'ArtificialIntelligence.calculateMove: drawn game, no move found.';
    return move;
  };

  /* Finds the best move for 'side'. The function is an implementation of the minimax algorithm
   * with alpha-beta pruning.
   *
   * For the initial call, one should pass negative infinity for 'alpha', positive infinity for
   * 'beta', and '0' for 'height'. The height increases by one every time we descend into the
   * game tree (that is, when this function gets called).
   *
   * Explanation of why 'alpha' is initially set to negative infinity:
   * As no move was found yet, any move is better than a previously made move.
   *
   * Explanation of why 'beta' is initially set to positive infinity:
   * As no move was found yet, no move is worse than a previously made move.
   */
  this._search = function (grid, side, height, alpha, beta)
  {
    var value = this._nodeValue(grid, side);
    if (value !== 0)
    {
      /* No need to look further, the game will be decided at this point if both sides play
       * perfectly.
       */
      if (value > 0)
      {
        /* For positive values (meaning a win for 'side'), the height of the game tree (as
         * constructed thus far) is subtracted as it is seen as a penalty (if any other
         * path in the game tree is found that leads to a win with less moves, then that
         * path is preferred).
         */
        return value - height;
      }
      else
      {
        /* For negative values (meaning a loss for 'side'), the height of the game tree (as
         * constructed thus far) is added as it is seen as a bonus (if any other path in
         * the game tree is found that leads to a loss with more moves, then that path is
         * preferred).
         */
        return value + height;
      }
    }

    var moves = this._generateMoves(grid);
    if (moves.length === 0)
      return value; // Draw.

    var bestMove;
    var otherSide = side === 'X' ? 'O' : 'X';

    for (var i = 0; i < moves.length; i++)
    {
      var move = moves[i];

      this._makeMove(grid, move, side);

      /* Invert the value returned by _search(), as the best state for 'other_side' is the
       * worst state for 'side'.
       */
      var alphaCandidate = -this._search(grid, otherSide, height + 1, -beta, -alpha);

      this._undoMove(grid, move);

      /* When 'beta <= alpha' is true, it means that the opponent's move can be exploited by
       * our move. So for ourself, it means that the tested move was worse than a previously
       * made move, and we must've gone into a path that did not result from perfect play.
       * Therefore, there is no need to look for any superficially better move, as it would
       * only be a better move by wishful thinking (that is, wishing that the opponent did
       * not exploit our mistake).
       *
       * For example, 'beta <= alpha' is true when we go from a possible draw (beta is zero)
       * to a win (alpha is 10, see _node_value()), which, given perfect play, is impossible.
       *
       * Technical sidenote:
       * For the above wording to be a precise description of the algorithm as implemented,
       * 'beta < alpha' would have to be used (since with 'beta <= alpha', the tested move is
       * not necessarily worse than a previously made move, but may be equally as good as a
       * previously made move), but 'beta <= alpha' is more efficient, as it will more often
       * be true than 'beta < alpha', resulting in less nodes being searched. Therefore, the
       * algorithm is implemented using 'beta <= alpha' as the condition for pruning
       * branches.
       *
       * Comparison between minimax with and without alpha-beta pruning:
       * Were one to use the non-optimized minimax algorithm to find the best move in a new
       * game, then where the non-optimized minimax algorithm finds the best move and
       * evaluates 549946 nodes (taking say 8.51 seconds), the optimized alpha-beta algorithm
       * would also find the best move but evaluate only 20866 nodes (taking say only 0.33
       * seconds).
       *
       * Note that, initially, 'beta' is infinity, effectively disabling alpha-beta pruning
       * for the first node.
       */
      if (beta <= alpha)
        break;

      if (alphaCandidate > alpha)
      {
        /* The game tree tested (the tree of the current node or move) led to less loss
         * than the others tested so far.
         */
        alpha = alphaCandidate;

        /* If we're at the top of the game tree, we should keep track of which move is the
         * best, as we will return the best move to the initial caller of this function.
         */
        if (height === 0)
          bestMove = move;
      }
    }

    /* If we're still descending into the game tree, return 'alpha'. Otherwise, the search is
     * complete and the best move is found.
     */
    return height !== 0 ? alpha : bestMove;
  };

  /* Return positive infinity for a win, negative infinity for a loss, and 0 for unfinished or
   * drawn games.
   *
   * Why positive infinity and negative infinity instead of 1 and -1? Because later on, when this
   * function returns, we either add/subtract the height of the game tree (which is 9 at maximum)
   * to/from the return value (why we do this is explained there). Therefore, we have to make it
   * such that this addition/subtraction is safe, in that the result of the operation is
   * distinguishable from a draw (zero). In other words, for return values other than a draw
   * (zero), 'abs(value) - 9' * must never equal zero.
   */
  this._nodeValue = function (grid, side)
  {
    var gameResult = Rules.checkGameOver(grid);
    if (gameResult === null || gameResult['draw'])
    {
      // Game is unfinished or drawn.
      return 0;
    }
    else if (gameResult['winner'] === side)
    {
      // 'side' wins when their play is perfect.
      return this.infinity;
    }
    else
    {
      // 'side' loses when their opponent's play is perfect.
      return -this.infinity;
    }
  };

  this._generateMoves = function (grid)
  {
    var moves = [];
    for (var y = 0; y < grid.length; y++)
    {
      for (var x = 0; x < grid[y].length; x++)
      {
        if (grid[y][x] === '') // Cell empty?
          moves.push([x, y]);
      }
    }
    return moves;
  };

  this._makeMove = function (grid, move, side)
  {
    grid[move[1]][move[0]] = side;
  };

  this._undoMove = function (grid, move)
  {
    grid[move[1]][move[0]] = '';
  };
}

module.exports = ArtificialIntelligence;