/**
 * Binary min-heap of grid cells ordered by (primary, secondary, insertion
 * order). Stale entries are skipped by the caller (lazy deletion), which is
 * simpler and just as fast as decrease-key on grids this size.
 */
export class MinHeap {
  private nodes: number[] = []
  private primary: number[] = []
  private secondary: number[] = []
  private order: number[] = []
  private counter = 0

  get size(): number {
    return this.nodes.length
  }

  push(node: number, primary: number, secondary = 0): void {
    this.nodes.push(node)
    this.primary.push(primary)
    this.secondary.push(secondary)
    this.order.push(this.counter++)
    this.up(this.nodes.length - 1)
  }

  /** Removes and returns the smallest node. Caller must check `size` first. */
  pop(): number {
    const top = this.nodes[0]
    const last = this.nodes.length - 1
    this.move(last, 0)
    this.nodes.pop()
    this.primary.pop()
    this.secondary.pop()
    this.order.pop()
    if (this.nodes.length > 0) this.down(0)
    return top
  }

  private less(a: number, b: number): boolean {
    if (this.primary[a] !== this.primary[b]) return this.primary[a] < this.primary[b]
    if (this.secondary[a] !== this.secondary[b]) return this.secondary[a] < this.secondary[b]
    return this.order[a] < this.order[b]
  }

  private move(from: number, to: number): void {
    this.nodes[to] = this.nodes[from]
    this.primary[to] = this.primary[from]
    this.secondary[to] = this.secondary[from]
    this.order[to] = this.order[from]
  }

  private swap(a: number, b: number): void {
    const arrays = [this.nodes, this.primary, this.secondary, this.order]
    for (const arr of arrays) {
      const tmp = arr[a]
      arr[a] = arr[b]
      arr[b] = tmp
    }
  }

  private up(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!this.less(i, parent)) return
      this.swap(i, parent)
      i = parent
    }
  }

  private down(i: number): void {
    const n = this.nodes.length
    for (;;) {
      const l = 2 * i + 1
      const r = l + 1
      let smallest = i
      if (l < n && this.less(l, smallest)) smallest = l
      if (r < n && this.less(r, smallest)) smallest = r
      if (smallest === i) return
      this.swap(i, smallest)
      i = smallest
    }
  }
}
