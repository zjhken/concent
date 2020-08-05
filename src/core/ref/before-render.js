/** eslint-disable */
import { START } from '../../support/priv-constant';
import makeObState from '../state/make-ob-state';
import ccContext from '../../cc-context/index';

const { store } = ccContext;

export default function (ref) {
  const ctx = ref.ctx;
  ctx.renderCount += 1;

  // 不处于收集观察依赖 or 已经开始都要跳出此函数
  // strictMode模式下，会走两次beforeRender 一次afterRender，
  // 所以这里严格用ctx.__$$renderStatus === START 来控制只真正执行一次beforeRender
  if (!ctx.__$$autoWatch || ctx.__$$renderStatus === START) {
    return;
  }

  if (ctx.__$$renderStatus !== START) ctx.__$$renderStatus = START;

  if (ctx.__$$hasModuleState) {
    const { __$$prevModuleVer, module: refModule } = ctx;
    const moduleVer = store.getModuleVer(refModule);
    if (__$$prevModuleVer[refModule] !== moduleVer) {
      __$$prevModuleVer[refModule] = moduleVer;
      Object.assign(ctx.unProxyState, ctx.__$$mstate);
    }

    // 一直使用ref.state生成新的ref.state，相当于一直使用proxy对象生成proxy对象，会触发Maximum call问题
    // ref.state = makeObState(ref, ref.state, refModule, true);

    // 类组件this.reactSetState调用后生成的this.state是一个普通对象
    // 每次渲染前替换为Proxy对象，确保让类组件里使用this.state时是Proxy对象，进而能够收集到依赖
    ref.state = makeObState(ref, ctx.unProxyState, refModule, true);
    ctx.state = ref.state;

    ctx.__$$curWaKeys = {};
    ctx.__$$compareWaKeys = ctx.__$$nextCompareWaKeys;
    ctx.__$$compareWaKeyCount = ctx.__$$nextCompareWaKeyCount;

    // 渲染期间再次收集
    ctx.__$$nextCompareWaKeys = {};
    ctx.__$$nextCompareWaKeyCount = 0;
  }

  const { connectedModules, connect } = ctx;
  connectedModules.forEach(m => {
    // 非自动收集，在make-ob-state里不会触发get，这里直接跳出
    if (connect[m] !== '-') return;

    ctx.__$$curConnWaKeys[m] = {};
    ctx.__$$compareConnWaKeys[m] = ctx.__$$nextCompareConnWaKeys[m];
    ctx.__$$compareConnWaKeyCount[m] = ctx.__$$nextCompareConnWaKeyCount[m];

    // 渲染期间再次收集
    ctx.__$$nextCompareConnWaKeys[m] = {};
    ctx.__$$nextCompareConnWaKeyCount[m] = 0;
  });

}